import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, where, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase.js';
import { ImagePlus, Send, AlertTriangle, Stethoscope, Pill, Phone, FileText, X, FolderClosed, Search, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

import DoctorAnimation from './DoctorAnimation.js';
import DoctorCards from '../agents/DoctorCards.js';
import MedicineCards from '../agents/MedicineCards.js';
import EmergencyOverlay from '../agents/EmergencyOverlay.js';
import SymptomAlert from './SymptomAlert.js';

interface ChatProps {
  userProfile: any;
  userId: string;
}

const Chat: React.FC<ChatProps> = ({ userProfile, userId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  
  // File Attachment State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [selectedFileMime, setSelectedFileMime] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Storage Prompt State
  const [showStoragePrompt, setShowStoragePrompt] = useState(false);
  const [uploadingToStorage, setUploadingToStorage] = useState(false);
  const [pendingTextPrompt, setPendingTextPrompt] = useState('');

  // Expanded card section state: tracks message ID map
  const [expandedSections, setExpandedSections] = useState<Record<string, 'doctors' | 'medicine' | null>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history
  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/chats/default/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [userId]);

  // Load medical records subscription for AI context injection
  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/medicalRecords`),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMedicalRecords(records);
    });
    return () => unsubscribe();
  }, [userId]);

  // Proactive Care Generation
  useEffect(() => {
    const runProactiveCare = async () => {
      // Fetch records that need follow up
      const recordsRef = collection(db, `users/${userId}/medicalRecords`);
      const q = query(recordsRef, where('followedUp', '==', false));
      const snapshot = await getDocs(q);
      
      const dueRecords = snapshot.docs.filter(d => {
        const data = d.data();
        if (!data.followUpDate) return false;
        return new Date(data.followUpDate).getTime() <= Date.now();
      }).map(d => ({ id: d.id, ...d.data() }));

      if (dueRecords.length > 0) {
        // We have records to follow up on, ask Gemini to generate a message
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `[SYSTEM COMMAND]: The following medical records need follow-up: ${JSON.stringify(dueRecords)}. Generate a warm, caring follow-up message for the patient named ${userProfile?.displayName}. Do NOT include the ---ACTION--- block.`,
              history: [],
              userProfile,
            })
          });
          const data = await res.json();
          
          if (data.text) {
            // Save AI message
            await addDoc(collection(db, `users/${userId}/chats/default/messages`), {
              role: 'ai',
              content: data.text,
              timestamp: serverTimestamp(),
              agenticAction: null
            });
            
            // Mark as followed up
            for (const record of dueRecords) {
              await updateDoc(doc(db, `users/${userId}/medicalRecords`, record.id), {
                followedUp: true
              });
            }
          }
        } catch (e) {
          console.error("Failed to generate proactive care", e);
        }
      }
    };
    runProactiveCare();
  }, [userId, userProfile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setSelectedFileMime(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      const base64Content = resultStr.split(',')[1];
      setSelectedFileBase64(base64Content);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setSelectedFile(null);
    setSelectedFileBase64(null);
    setSelectedFileName(null);
    setSelectedFileMime(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendClick = () => {
    if (!inputText.trim() && !selectedFile) return;

    if (selectedFile) {
      setPendingTextPrompt(inputText);
      setShowStoragePrompt(true);
    } else {
      handleSend(inputText, null, null, null);
    }
  };

  const handleJustAnalyze = () => {
    setShowStoragePrompt(false);
    handleSend(pendingTextPrompt, selectedFileBase64, selectedFileMime, null);
    handleRemoveAttachment();
    setPendingTextPrompt('');
  };

  const handleSaveDocument = async () => {
    if (!selectedFile || !selectedFileBase64) return;
    setUploadingToStorage(true);
    try {
      // 1. Upload to Firebase Storage
      const timestamp = Date.now();
      const storageRef = ref(storage, `users/${userId}/documents/${timestamp}_${selectedFile.name}`);
      await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(storageRef);

      // 2. Save record to users/{userId}/medicalRecords
      const docRef = await addDoc(collection(db, `users/${userId}/medicalRecords`), {
        type: 'medical_document',
        targetName: selectedFile.name.split('.')[0] || 'Medical Document',
        details: `${selectedFile.name} — Stored on ${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        status: 'Stored',
        documentUrl: downloadUrl,
        documentType: selectedFile.type,
        fileName: selectedFile.name,
        caseName: null,
        createdAt: serverTimestamp(),
        followUpDate: null,
        followedUp: false
      });

      setShowStoragePrompt(false);
      setUploadingToStorage(false);

      // 3. Trigger handleSend with document ID references
      handleSend(pendingTextPrompt, selectedFileBase64, selectedFileMime, docRef.id);

    } catch (err) {
      console.error("Failed to save document:", err);
      setUploadingToStorage(false);
      handleJustAnalyze(); // Fallback to analysis only if storage write fails
    }
    handleRemoveAttachment();
    setPendingTextPrompt('');
  };

  const handleSend = async (text: string, fileBase64: string | null = null, fileMime: string | null = null, pendingDocId: string | null = null) => {
    const currentText = text;
    setInputText('');

    let userMsgContent = currentText;
    if (fileBase64) {
      const fileLabel = `[Attachment: ${selectedFileName || 'File'}]`;
      userMsgContent = currentText ? `${currentText}\n\n${fileLabel}` : fileLabel;
    }

    // Save user message
    await addDoc(collection(db, `users/${userId}/chats/default/messages`), {
      role: 'user',
      content: userMsgContent,
      timestamp: serverTimestamp(),
      agenticAction: null
    });

    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentText,
          history: messages.slice(-10).map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
          userProfile,
          medicalRecords: medicalRecords.map(r => ({
            ...r,
            createdAt: r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : r.createdAt,
            followUpDate: r.followUpDate
          })),
          image: fileBase64,
          imageMimeType: fileMime
        })
      });

      const data = await res.json();
      let responseText = data.text;
      let agenticAction = null;

      // Parse ACTION block if present
      const actionMatch = responseText.match(/---ACTION---\s*(\{[\s\S]*?\})/);
      if (actionMatch) {
        try {
          agenticAction = JSON.parse(actionMatch[1]);
          responseText = responseText.replace(/---ACTION---\s*(\{[\s\S]*?\})/, '').trim();
        } catch (e) {
          console.error("Failed to parse action json", e);
        }
      }

      // If document was uploaded, update Firestore with case name from Gemini analysis
      if (pendingDocId && agenticAction?.suggestedCaseName) {
        try {
          await updateDoc(doc(db, `users/${userId}/medicalRecords`, pendingDocId), {
            caseName: agenticAction.suggestedCaseName,
            targetName: agenticAction.suggestedCaseName,
            details: `${agenticAction.suggestedCaseName} — uploaded on ${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`
          });
        } catch (e) {
          console.error("Failed to update case name on document record:", e);
        }
      }

      // Save AI message
      await addDoc(collection(db, `users/${userId}/chats/default/messages`), {
        role: 'ai',
        content: responseText,
        timestamp: serverTimestamp(),
        agenticAction
      });

    } catch (error) {
      console.error("Chat error", error);
      await addDoc(collection(db, `users/${userId}/chats/default/messages`), {
        role: 'ai',
        content: 'I apologize, but I am having trouble connecting to the medical network right now. Please try again.',
        timestamp: serverTimestamp(),
        agenticAction: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExternalLink = async (type: 'doctor_visit' | 'medicine_order', data: any, url: string) => {
    try {
      await addDoc(collection(db, `users/${userId}/medicalRecords`), {
        type,
        targetName: type === 'doctor_visit' ? data.name : data.name,
        details: type === 'doctor_visit' 
          ? `${data.speciality} - ${data.hospital}` 
          : `${data.name} from ${data.store}`,
        status: 'pending_confirmation',
        createdAt: serverTimestamp(),
        confirmedByUser: null,
        fee: data.fee || null,
        oladocUrl: url,
        providerData: data,
        followedUp: false,
        followUpDate: null
      });
    } catch (err) {
      console.error("Failed to save pending confirmation:", err);
    }
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
          >
            <div className={`p-4 shadow-sm ${msg.role === 'user' ? 'bg-slate-100 rounded-3xl rounded-tr-none' : 'bg-white border border-slate-100 rounded-3xl rounded-tl-none'}`}>
              {msg.role === 'ai' ? (
                <div className="markdown-body text-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm white-space-pre-wrap">{msg.content}</p>
              )}
            </div>

            {/* Agentic Buttons (Gateway) and Cards below last AI message */}
            {msg.role === 'ai' && msg.agenticAction && (
              <div className="mt-3 w-full flex flex-col gap-3">
                {msg.agenticAction.symptomPatternAlert && (
                  <SymptomAlert pattern={msg.agenticAction.symptomPattern || 'Recurring symptoms detected.'} />
                )}

                {msg.agenticAction.detectEmergency && idx === messages.length - 1 && (
                  <EmergencyOverlay active={true} userCity={userProfile?.city} medicalCase={msg.agenticAction.medicalCase} userId={userId} />
                )}

                {/* Gateway Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-1">
                  {msg.agenticAction.consultDoctor && (
                    <button
                      onClick={() => setExpandedSections(prev => ({
                        ...prev,
                        [msg.id]: prev[msg.id] === 'doctors' ? null : 'doctors'
                      }))}
                      className={`px-4 py-2 border rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95
                        ${expandedSections[msg.id] === 'doctors'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'
                        }
                      `}
                    >
                      <Stethoscope className="w-4 h-4" /> Consult Specialist
                    </button>
                  )}

                  {msg.agenticAction.orderMedicine && (
                    <button
                      onClick={() => setExpandedSections(prev => ({
                        ...prev,
                        [msg.id]: prev[msg.id] === 'medicine' ? null : 'medicine'
                      }))}
                      className={`px-4 py-2 border rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95
                        ${expandedSections[msg.id] === 'medicine'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }
                      `}
                    >
                      <Pill className="w-4 h-4" /> Look For Medicine
                    </button>
                  )}

                  {msg.agenticAction.detectEmergency && (
                    <button
                      onClick={() => {
                        const triggerBtn = document.querySelector('.emergency-overlay-trigger-btn') as HTMLButtonElement;
                        if (triggerBtn) {
                          triggerBtn.click();
                        } else {
                          alert("Ambulance dispatch workflow triggered. Cycling local emergency services...");
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Phone className="w-4 h-4" /> Call Ambulance
                    </button>
                  )}
                </div>

                {/* Dynamically Loaded Cards (Only loaded and shown on gateway click) */}
                {expandedSections[msg.id] === 'doctors' && msg.agenticAction.consultDoctor && (
                  <DoctorCards 
                    speciality={msg.agenticAction.recommendedSpeciality} 
                    userCity={userProfile?.city}
                    onLinkClick={(doctor, url) => handleExternalLink('doctor_visit', doctor, url)} 
                  />
                )}

                {expandedSections[msg.id] === 'medicine' && msg.agenticAction.orderMedicine && (
                  <MedicineCards 
                    medicine={msg.agenticAction.recommendedMedicine || msg.agenticAction.medicalCase} 
                    onLinkClick={(medicine, url) => handleExternalLink('medicine_order', medicine, url)} 
                  />
                )}
              </div>
            )}
          </motion.div>
        ))}
        {loading && <DoctorAnimation />}
        
        {/* Document Storage Prompt Card */}
        {showStoragePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50/70 border border-amber-200 rounded-[2rem] p-6 max-w-sm mx-auto shadow-sm flex flex-col gap-4 mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100/80 rounded-2xl">
                <FileText className="w-6 h-6 text-amber-600 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-heading font-bold text-slate-900 text-base leading-tight">Save to Medical Records?</h4>
                <p className="text-[10px] font-bold text-amber-800 truncate mt-0.5">{selectedFileName}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Would you like this document to be saved in your Medical Records for future reference and health tracking?
            </p>
            {uploadingToStorage ? (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-[10px] font-bold text-slate-500">Uploading file and saving report...</p>
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveDocument}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FolderClosed className="w-3.5 h-3.5" /> Yes, Save It
                </button>
                <button
                  onClick={handleJustAnalyze}
                  className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm hover:bg-slate-50"
                >
                  <Search className="w-3.5 h-3.5" /> Just Analyze
                </button>
              </div>
            )}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Dock */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)] z-10">
        <div className="max-w-4xl mx-auto">
          {/* File input */}
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
          />

          {/* Attachment Preview Badge */}
          {selectedFile && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 mb-3 max-w-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 truncate">{selectedFileName}</span>
              </div>
              <button 
                onClick={handleRemoveAttachment}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-3xl p-2 focus-within:ring-2 ring-blue-100 transition-all">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-blue-600 transition-colors rounded-2xl hover:bg-white shrink-0"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendClick();
                }
              }}
              placeholder="Ask about your symptoms, medical reports, or health concerns..."
              className="flex-1 bg-transparent resize-none max-h-32 min-h-[44px] py-3 px-2 text-sm focus:outline-none"
              rows={1}
            />
            <button
              onClick={handleSendClick}
              disabled={(!inputText.trim() && !selectedFile) || loading || showStoragePrompt}
              className="p-3 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 rounded-2xl transition-colors shrink-0 shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-center gap-6 mt-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> HIPAA COMPLIANT</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 24/7 EMERGENCY READY</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Chat;
