import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
  getDocs, where, updateDoc, doc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase.js';
import { API_BASE } from '../lib/api.js';
import {
  Paperclip, Send, AlertTriangle, Stethoscope, Pill, Phone,
  FileText, X, FolderClosed, Search, ChevronLeft, Pencil, Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { useDesktopLayout } from '../lib/environment.js';

import DoctorAnimation from '../components/chat/DoctorAnimation.js';
import DoctorCards from '../components/agents/DoctorCards.js';
import MedicineCards from '../components/agents/MedicineCards.js';
import EmergencyOverlay from '../components/agents/EmergencyOverlay.js';
import SymptomAlert from '../components/chat/SymptomAlert.js';
import BookingSimulationOverlay from '../components/agents/BookingSimulationOverlay.js';

interface ConsultationPageProps {
  userProfile: any;
  userId: string;
}

const SUGGESTION_CHIPS = [
  'I have a headache',
  'Analyze my medical report',
  'Emergency — I need help now',
  'Check my health status',
];

const ConsultationPage: React.FC<ConsultationPageProps> = ({ userProfile, userId }) => {
  const isDesktop = useDesktopLayout();
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);

  const [chatName, setChatName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [selectedFileMime, setSelectedFileMime] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [showStoragePrompt, setShowStoragePrompt] = useState(false);
  const [uploadingToStorage, setUploadingToStorage] = useState(false);
  const [pendingTextPrompt, setPendingTextPrompt] = useState('');

  const [expandedSections, setExpandedSections] = useState<Record<string, 'doctors' | 'medicine' | null>>({});
  const [activeBooking, setActiveBooking] = useState<{ type: 'doctor_visit' | 'medicine_order'; data: any } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!chatId) return null;

  // Greeting
  const firstName = userProfile?.displayName?.split(' ')[0] || 'Abbas';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? `Good morning, ${firstName}` : hour < 17 ? `Good afternoon, ${firstName}` : `Good evening, ${firstName}`;

  useEffect(() => {
    const chatDoc = doc(db, `users/${userId}/chats`, chatId);
    const getDat = async () => {
      const { getDoc } = await import('firebase/firestore');
      const snap = await getDoc(chatDoc);
      if (snap.exists()) {
        const data = snap.data();
        setChatName(data.name || 'Consultation');
        setNameValue(data.name || 'Consultation');
      }
    };
    getDat();
  }, [userId, chatId]);

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/chats/${chatId}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [userId, chatId]);

  useEffect(() => {
    const q = query(
      collection(db, `users/${userId}/medicalRecords`),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMedicalRecords(records);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const runProactiveCare = async () => {
      const recordsRef = collection(db, `users/${userId}/medicalRecords`);
      const q = query(recordsRef, where('followedUp', '==', false));
      const snapshot = await getDocs(q);
      const dueRecords = snapshot.docs.filter((d) => {
        const data = d.data();
        if (!data.followUpDate) return false;
        return new Date(data.followUpDate).getTime() <= Date.now();
      }).map((d) => ({ id: d.id, ...d.data() }));

      if (dueRecords.length > 0) {
        try {
          const { sendMessage } = await import('../services/ai/chatService.js');
          const data = await sendMessage({
            message: `[SYSTEM COMMAND]: The following medical records need follow-up: ${JSON.stringify(dueRecords)}. Generate a warm, caring follow-up message for the patient named ${userProfile?.displayName}. Do NOT include the ---ACTION--- block.`,
            history: [],
            userProfile,
          });
          if (data.text) {
            await addDoc(collection(db, `users/${userId}/chats/${chatId}/messages`), {
              role: 'ai',
              content: data.text,
              timestamp: serverTimestamp(),
              agenticAction: null,
            });
            for (const record of dueRecords) {
              await updateDoc(doc(db, `users/${userId}/medicalRecords`, record.id), { followedUp: true });
            }
          }
        } catch (e) {
          console.error('Failed to generate proactive care', e);
        }
      }
    };
    runProactiveCare();
  }, [userId, chatId, userProfile]);

  const confirmNameEdit = async () => {
    if (nameValue.trim()) {
      await updateDoc(doc(db, `users/${userId}/chats`, chatId), { name: nameValue.trim() });
      setChatName(nameValue.trim());
    }
    setEditingName(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setSelectedFileName(file.name);
    setSelectedFileMime(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      setSelectedFileBase64(resultStr.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setSelectedFile(null);
    setSelectedFileBase64(null);
    setSelectedFileName(null);
    setSelectedFileMime(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendClick = (text?: string) => {
    const msg = text ?? inputText;
    if (!msg.trim() && !selectedFile) return;
    if (text) setInputText('');
    if (selectedFile) {
      setPendingTextPrompt(msg);
      setShowStoragePrompt(true);
    } else {
      handleSend(msg, null, null, null);
      setInputText('');
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
      const timestamp = Date.now();
      const storagePath = `users/${userId}/documents/${timestamp}_${selectedFile.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadResult = await uploadBytes(storageRef, selectedFile);
      const downloadUrl = await getDownloadURL(storageRef);
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
        followedUp: false,
      });
      setShowStoragePrompt(false);
      setUploadingToStorage(false);
      handleSend(pendingTextPrompt, selectedFileBase64, selectedFileMime, docRef.id);
    } catch (err: any) {
      console.error('[Doc Save] FAILED:', err?.code || err?.message, err);
      setUploadingToStorage(false);
      await addDoc(collection(db, `users/${userId}/chats/${chatId}/messages`), {
        role: 'ai',
        content: `⚠️ Could not save "${selectedFile?.name}" to your Medical Library (${err?.code || 'storage error'}). The file has been analyzed only.`,
        timestamp: serverTimestamp(),
        agenticAction: null,
      });
      setShowStoragePrompt(false);
      handleSend(pendingTextPrompt, selectedFileBase64, selectedFileMime, null);
    }
    handleRemoveAttachment();
    setPendingTextPrompt('');
  };

  const handleSend = async (
    text: string,
    fileBase64: string | null = null,
    fileMime: string | null = null,
    pendingDocId: string | null = null
  ) => {
    const currentText = text;
    setInputText('');

    let userMsgContent = currentText;
    if (fileBase64) {
      const fileLabel = `[Attachment: ${selectedFileName || 'File'}]`;
      userMsgContent = currentText ? `${currentText}\n\n${fileLabel}` : fileLabel;
    }

    const userMsg = await addDoc(collection(db, `users/${userId}/chats/${chatId}/messages`), {
      role: 'user',
      content: userMsgContent,
      timestamp: serverTimestamp(),
      agenticAction: null,
    });

    await updateDoc(doc(db, `users/${userId}/chats`, chatId), {
      lastMessage: userMsgContent.length > 80 ? userMsgContent.slice(0, 80) + '…' : userMsgContent,
      lastMessageAt: serverTimestamp(),
    }).catch(() => {});

    setLoading(true);

    try {
      const { sendMessage } = await import('../services/ai/chatService.js');
      const data = await sendMessage({
        message: currentText,
        history: messages.slice(-10).map((msg) => ({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        userProfile,
        medicalRecords: medicalRecords.map((r) => ({
          ...r,
          createdAt: r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : r.createdAt,
          followUpDate: r.followUpDate,
        })),
        image: fileBase64 || undefined,
        imageMimeType: fileMime || undefined,
      });
      let responseText = data.text ?? '';
      let agenticAction = null;

      const actionMatch = responseText.match(/---ACTION---\s*(\{[\s\S]*?\})/);
      if (actionMatch) {
        try {
          agenticAction = JSON.parse(actionMatch[1]);
          responseText = responseText.replace(/---ACTION---\s*(\{[\s\S]*?\})/, '').trim();
        } catch (e) {
          console.error('Failed to parse action json', e);
        }
      }

      if (pendingDocId && agenticAction?.suggestedCaseName) {
        try {
          await updateDoc(doc(db, `users/${userId}/medicalRecords`, pendingDocId), {
            caseName: agenticAction.suggestedCaseName,
            targetName: agenticAction.suggestedCaseName,
            details: `${agenticAction.suggestedCaseName} — uploaded on ${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`,
          });
        } catch (e) {
          console.error('Failed to update case name on document record:', e);
        }
      }

      await addDoc(collection(db, `users/${userId}/chats/${chatId}/messages`), {
        role: 'ai',
        content: responseText,
        timestamp: serverTimestamp(),
        agenticAction,
      });

      await updateDoc(doc(db, `users/${userId}/chats`, chatId), {
        lastMessage: responseText.length > 80 ? responseText.slice(0, 80) + '…' : responseText,
        lastMessageAt: serverTimestamp(),
      }).catch(() => {});
    } catch (error) {
      console.error('Chat error', error);
      await addDoc(collection(db, `users/${userId}/chats/${chatId}/messages`), {
        role: 'ai',
        content: 'I apologize, but I am having trouble connecting to the medical network right now. Please try again.',
        timestamp: serverTimestamp(),
        agenticAction: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExternalLink = async (type: 'doctor_visit' | 'medicine_order', data: any, url: string) => {
    setActiveBooking({ type, data });
  };

  const handleBookingConfirm = async () => {
    if (!activeBooking) return;
    const { type, data } = activeBooking;
    
    try {
      await addDoc(collection(db, `users/${userId}/medicalRecords`), {
        type,
        targetName: data.name,
        details: type === 'doctor_visit' ? `${data.speciality} - ${data.hospital}` : `${data.name} from ${data.store}`,
        status: 'Confirmed',
        createdAt: serverTimestamp(),
        confirmedByUser: true,
        fee: data.fee || null,
        providerData: data,
        followedUp: false,
        followUpDate: type === 'doctor_visit' 
          ? new Date(Date.now() + 3 * 60 * 1000).toISOString() 
          : new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      });
    } catch (err) {
      console.error('Failed to save confirmed booking:', err);
    }
    setActiveBooking(null);
  };

  const isEmpty = messages.length === 0 && !loading && !showStoragePrompt;

  return (
    <div className="flex flex-col flex-1 w-full h-full relative" style={{ backgroundColor: '#ffffff' }}>
      {/* Chat Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0 z-10">
        <button
          onClick={() => navigate('/consultation')}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>

        {editingName ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmNameEdit();
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="flex-1 text-sm font-bold border border-blue-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 ring-blue-200"
            />
            <button onClick={confirmNameEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditingName(false)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800 truncate flex-1">{chatName}</h2>
            <button
              onClick={() => setEditingName(true)}
              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Empty State — Elegant, smooth light gradient (Gemini mobile style) */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col flex-1 relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f4f8ff 40%, #e6f0ff 100%)'
            }}
          >
            {/* Soft, colorful medical glow in the background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{
                background: 'radial-gradient(ellipse 60% 50% at 50% 10%, rgba(56,189,248,0.12) 0%, rgba(99,102,241,0.05) 50%, transparent 80%)'
              }}
            />
            
            <div
              className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none opacity-50"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(59,130,246,0.15) 0%, transparent 70%)'
              }}
            />

            {/* Greeting — centered floating */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 100 }}
                className="text-center w-full max-w-sm"
              >
                {/* Gemini-style elegant icon/star equivalent */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-200">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-light text-slate-800 tracking-tight">
                  {greeting}
                </h2>
                <p className="text-slate-500 mt-3 text-[15px] font-normal">
                  How can Heal U help you today?
                </p>
              </motion.div>
            </div>

            {/* Bottom section: Suggestion chips + Input field */}
            <div className="px-5 pb-6 pt-2 relative z-10 w-full max-w-2xl mx-auto">
              {/* Suggestion chips placed beautifully above input */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="flex flex-wrap justify-center gap-2 mb-4"
              >
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendClick(chip)}
                    className="px-4 py-2.5 text-[13px] font-medium text-slate-600 bg-white/70 border border-slate-200/60 rounded-full shadow-sm hover:bg-white hover:text-blue-600 hover:border-blue-200 hover:shadow transition-all active:scale-95 backdrop-blur-md"
                  >
                    {chip}
                  </button>
                ))}
              </motion.div>

              {/* Input Field at the bottom */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="w-full"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf" />
                
                {selectedFile && (
                  <div className="flex items-center justify-between bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl px-4 py-2 mb-3 max-w-sm mx-auto shadow-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700 truncate">{selectedFileName}</span>
                    </div>
                    <button onClick={handleRemoveAttachment} className="p-1 hover:bg-red-50 hover:text-red-500 rounded-full text-slate-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.12)] focus-within:border-blue-300 focus-within:shadow-[0_8px_30px_rgba(15,23,42,0.18)] focus-within:ring-4 focus-within:ring-blue-100/50 transition-all">
                  <button onClick={() => fileInputRef.current?.click()} className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors shrink-0">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendClick(); } }}
                    placeholder="Ask about your symptoms..."
                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none px-1"
                  />
                  <button
                    onClick={() => handleSendClick()}
                    disabled={!inputText.trim() && !selectedFile}
                    className="p-2.5 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 rounded-2xl transition-all shrink-0 active:scale-95 shadow-sm disabled:shadow-none"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area — only shown when there are messages */}
      {!isEmpty && (
        <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${isDesktop ? 'pb-28' : ''}`}>
          <div className={isDesktop ? "max-w-3xl mx-auto w-full space-y-6" : "space-y-6"}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className={`p-4 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                    : 'bg-white border border-slate-100 rounded-2xl rounded-bl-sm'
                }`}>
                  {msg.role === 'ai' ? (
                    <div className="markdown-body text-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap text-white">{msg.content}</p>
                  )}
                </div>

                {msg.role === 'ai' && msg.agenticAction && (
                  <div className="mt-3 w-full flex flex-col gap-3">
                    {msg.agenticAction.symptomPatternAlert && (
                      <SymptomAlert pattern={msg.agenticAction.symptomPattern || 'Recurring symptoms detected.'} />
                    )}
                    {msg.agenticAction.detectEmergency && idx === messages.length - 1 && (
                      <EmergencyOverlay
                        active={true}
                        userCity={userProfile?.city}
                        medicalCase={msg.agenticAction.medicalCase}
                        userId={userId}
                      />
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.agenticAction.consultDoctor && (
                        <button
                          onClick={() => setExpandedSections((prev) => ({ ...prev, [msg.id]: prev[msg.id] === 'doctors' ? null : 'doctors' }))}
                          className={`px-4 py-2 border rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 ${expandedSections[msg.id] === 'doctors' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                        >
                          <Stethoscope className="w-4 h-4" /> Consult Specialist
                        </button>
                      )}
                      {msg.agenticAction.orderMedicine && (
                        <button
                          onClick={() => setExpandedSections((prev) => ({ ...prev, [msg.id]: prev[msg.id] === 'medicine' ? null : 'medicine' }))}
                          className={`px-4 py-2 border rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 ${expandedSections[msg.id] === 'medicine' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          <Pill className="w-4 h-4" /> Look For Medicine
                        </button>
                      )}
                      {msg.agenticAction.detectEmergency && (
                        <button
                          onClick={() => {
                            const triggerBtn = document.querySelector('.emergency-overlay-trigger-btn') as HTMLButtonElement;
                            if (triggerBtn) triggerBtn.click();
                            else alert('Ambulance dispatch workflow triggered. Cycling local emergency services...');
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <Phone className="w-4 h-4" /> Call Ambulance
                        </button>
                      )}
                    </div>
                    {expandedSections[msg.id] === 'doctors' && msg.agenticAction.consultDoctor && (
                      <DoctorCards speciality={msg.agenticAction.recommendedSpeciality} userCity={userProfile?.city} onLinkClick={(doctor, url) => handleExternalLink('doctor_visit', doctor, url)} />
                    )}
                    {expandedSections[msg.id] === 'medicine' && msg.agenticAction.orderMedicine && (
                      <MedicineCards medicine={msg.agenticAction.recommendedMedicine || msg.agenticAction.medicalCase} onLinkClick={(medicine, url) => handleExternalLink('medicine_order', medicine, url)} />
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {loading && <DoctorAnimation />}

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
                <p className="text-xs text-slate-600 leading-relaxed">Would you like this document to be saved in your Medical Records for future reference and health tracking?</p>
                {uploadingToStorage ? (
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-[10px] font-bold text-slate-500">Uploading file and saving report...</p>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleSaveDocument} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm">
                      <FolderClosed className="w-3.5 h-3.5" /> Yes, Save It
                    </button>
                    <button onClick={handleJustAnalyze} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm hover:bg-slate-50">
                      <Search className="w-3.5 h-3.5" /> Just Analyze
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Fixed Bottom Input Dock — only when messages exist */}
      {!isEmpty && (
        <div className={isDesktop ? "fixed bottom-0 right-0 bg-white border-t border-slate-200 p-4 left-60 z-10 shadow-[0_-8px_32px_rgba(0,0,0,0.04)]" : "bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4 shrink-0 shadow-[0_-8px_32px_rgba(0,0,0,0.04)] z-10"}>
          <div className={isDesktop ? "max-w-3xl mx-auto w-full" : "max-w-4xl mx-auto"}>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf" />

            {selectedFile && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 mb-3 max-w-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 truncate">{selectedFileName}</span>
                </div>
                <button onClick={handleRemoveAttachment} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(15,23,42,0.08)] focus-within:border-blue-300 focus-within:shadow-[0_4px_20px_rgba(15,23,42,0.12)] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <button onClick={() => fileInputRef.current?.click()} className="text-slate-600 hover:text-blue-600 transition-colors shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendClick();
                  }
                }}
                placeholder="Ask about your symptoms, medical reports, or health concerns..."
                className="flex-1 bg-transparent resize-none max-h-32 min-h-[24px] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                rows={1}
              />
              <button
                onClick={() => handleSendClick()}
                disabled={(!inputText.trim() && !selectedFile) || loading || showStoragePrompt}
                className="p-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 font-medium mt-2.5 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
              24/7 Available
            </p>
          </div>
        </div>
      )}

      <BookingSimulationOverlay
        activeBooking={activeBooking}
        onCancel={() => setActiveBooking(null)}
        onConfirm={handleBookingConfirm}
      />
    </div>
  );
};

export default ConsultationPage;
