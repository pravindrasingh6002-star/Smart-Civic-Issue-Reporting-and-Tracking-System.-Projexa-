import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    appName: 'Gram Suvidha',
    tagline: 'Gram Panchayat Civic Issue Reporting & Governance',
    navReport: 'Report Issue',
    navTrack: 'Track Status',
    navMap: 'Village Map',
    navDashboard: 'Panchayat Dashboard',
    navMembers: 'Members',
    navLogin: 'Panchayat Login',
    navLogout: 'Logout',
    heroTitle: 'Raise Your Voice for a Better Village',
    heroSub: 'Snap a geotagged photo, drop a map pin, and route civic issues directly to your Ward Panchayat member.',
    selectCategory: '1. Select Issue Category',
    uploadPhoto: '2. Photo Evidence (Auto-Compressed for 2G/3G)',
    pinLocation: '3. Pin Exact Location & Ward',
    selectWard: 'Select Ward / Area',
    addressPlaceholder: 'Landmark (e.g. Near Primary School, Handpump #2)',
    describeIssue: '4. Describe the Problem',
    voiceBtn: 'Speak (Voice-to-Text)',
    voiceListening: 'Listening... Speak now',
    yourDetails: '5. Your Contact Details (For Status Updates)',
    namePlaceholder: 'Your Name (Optional)',
    phonePlaceholder: '10-digit Mobile Number',
    submitReport: 'Submit Civic Report',
    submitting: 'Submitting Report...',
    nearbyAlertTitle: 'Similar Issue Already Reported Nearby!',
    nearbyAlertSub: 'An unresolved issue in this category exists within 200 meters. You can upvote it or still submit a new report.',
    upvoteBtn: 'Affects Me Too',
    upvotedBtn: 'Upvoted',
    trackTitle: 'Track Your Complaint',
    trackSub: 'Enter your Tracking ID (e.g. CVC-8F3A21B9) or your 10-digit phone number.',
    trackById: 'By Tracking ID',
    trackByPhone: 'By Phone Number',
    searchBtn: 'Check Status',
    receiptTitle: 'Official Gram Panchayat Complaint Receipt',
    printReceipt: 'Print / Save PDF Receipt',
    shareWhatsApp: 'Share on WhatsApp',
    beforePhoto: 'Before (Reported Photo)',
    afterPhoto: 'After (Resolution Proof)',
    slaOverdue: 'SLA Overdue (>72h)',
    avgResolution: 'Avg Resolution Time',
    exportCsv: 'Export CSV Report',
    notifyCitizenWhatsApp: 'Notify Citizen on WhatsApp'
  },
  hi: {
    appName: 'ग्राम सुविधा',
    tagline: 'ग्राम पंचायत नागरिक समस्या निवारण एवं सुशासन मंच',
    navReport: 'समस्या दर्ज करें',
    navTrack: 'स्थिति जानें',
    navMap: 'गाँव का नक्शा',
    navDashboard: 'पंचायत डैशबोर्ड',
    navMembers: 'सदस्य सूची',
    navLogin: 'पंचायत लॉगिन',
    navLogout: 'लॉगआउट',
    heroTitle: 'अपने गाँव के विकास के लिए आवाज़ उठाएँ',
    heroSub: 'फोटो लें, नक्शे पर स्थान चुनें और अपनी समस्या सीधे संबंधित वार्ड पंचायत सदस्य तक पहुँचाएँ।',
    selectCategory: '1. समस्या की श्रेणी चुनें',
    uploadPhoto: '2. फोटो अपलोड करें (2G/3G नेटवर्क के लिए स्वतः कम्प्रेस)',
    pinLocation: '3. सही स्थान और वार्ड चुनें',
    selectWard: 'वार्ड / क्षेत्र चुनें',
    addressPlaceholder: 'पहचान चिन्ह (जैसे: प्राथमिक विद्यालय के पास)',
    describeIssue: '4. समस्या का विवरण लिखें या बोलें',
    voiceBtn: 'बोलकर लिखें (माइक)',
    voiceListening: 'सुन रहे हैं... कृपया बोलें',
    yourDetails: '5. आपका संपर्क विवरण (अपडेट पाने के लिए)',
    namePlaceholder: 'आपका नाम (वैकल्पिक)',
    phonePlaceholder: '10 अंकों का मोबाइल नंबर',
    submitReport: 'शिकायत दर्ज करें',
    submitting: 'दर्ज हो रहा है...',
    nearbyAlertTitle: 'पास में ऐसी ही समस्या पहले से दर्ज है!',
    nearbyAlertSub: '200 मीटर के दायरे में इस श्रेणी की शिकायत पहले से मौजूद है। आप उसे समर्थन (+1) दे सकते हैं या नई शिकायत दर्ज कर सकते हैं।',
    upvoteBtn: 'मुझे भी समस्या है',
    upvotedBtn: 'समर्थन दिया गया',
    trackTitle: 'अपनी शिकायत की स्थिति जानें',
    trackSub: 'अपनी ट्रैकिंग आईडी (जैसे CVC-8F3A21B9) या मोबाइल नंबर दर्ज करें।',
    trackById: 'ट्रैकिंग आईडी से',
    trackByPhone: 'मोबाइल नंबर से',
    searchBtn: 'स्थिति देखें',
    receiptTitle: 'ग्राम पंचायत शिकायत पावती रसीद',
    printReceipt: 'रसीद प्रिंट / डाउनलोड करें',
    shareWhatsApp: 'व्हाट्सएप पर साझा करें',
    beforePhoto: 'पहले (शिकायत की फोटो)',
    afterPhoto: 'बाद में (समाधान का प्रमाण)',
    slaOverdue: 'समय सीमा समाप्त (>72 घंटे)',
    avgResolution: 'औसत समाधान समय',
    exportCsv: 'CSV रिपोर्ट डाउनलोड करें',
    notifyCitizenWhatsApp: 'नागरिक को व्हाट्सएप सूचना भेजें'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('gram_suvidha_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('gram_suvidha_lang', lang);
  }, [lang]);

  const t = (key) => {
    return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
  };

  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { lang, setLang, toggleLang, t } },
    children
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
