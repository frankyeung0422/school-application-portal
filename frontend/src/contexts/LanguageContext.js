import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const translations = {
  en: {
    // Navigation
    home: 'Home',
    kindergartens: 'Kindergartens',
    about: 'About',
    profile: 'Profile',
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
    
    // Home Page
    welcomeTitle: 'Welcome to Hong Kong School Application Portal',
    welcomeSubtitle: 'Find and apply to the best kindergartens in Hong Kong',
    getStarted: 'Get Started',
    learnMore: 'Learn More',
    
    // Kindergarten List
    hongKongKindergartens: 'Hong Kong Kindergartens',
    findAndExplore: 'Find and explore kindergartens across Hong Kong',
    searchPlaceholder: 'Search by name or district...',
    allDistricts: 'All Districts',
    clearFilters: 'Clear Filters',
    showingResults: 'Showing {count} of {total} kindergartens',
    noResults: 'No kindergartens found matching your criteria.',
    viewDetails: 'View Details',
    applyNow: 'Apply Now',
    
    // Kindergarten Detail
    backToKindergartens: '← Back to Kindergartens',
    schoolNo: 'School No',
    district: 'District',
    address: 'Address',
    phone: 'Phone',
    website: 'Website',
    visitWebsite: 'Visit Website',
    organization: 'Organization',
    startApplication: 'Start Application',
    quickFacts: 'Quick Facts',
    locatedIn: 'Located in',
    governmentRegistered: 'Government registered',
    professionalStaff: 'Professional staff',
    
    // Application Form
    applicationForm: 'Application Form',
    childName: 'Child Name',
    childAge: 'Child Age',
    parentName: 'Parent Name',
    parentEmail: 'Parent Email',
    parentPhone: 'Parent Phone',
    preferredStartDate: 'Preferred Start Date',
    additionalNotes: 'Additional Notes',
    submitApplication: 'Submit Application',
    cancel: 'Cancel',
    
    // Auth
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    name: 'Name',
    phoneNumber: 'Phone Number',
    loginTitle: 'Login to Your Account',
    signupTitle: 'Create New Account',
    forgotPassword: 'Forgot Password?',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    
    // Profile
    userProfile: 'User Profile',
    childrenProfiles: 'Children Profiles',
    addChild: 'Add Child',
    editChild: 'Edit Child',
    deleteChild: 'Delete Child',
    childDateOfBirth: 'Date of Birth',
    save: 'Save',
    delete: 'Delete',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    notFound: 'Not Found',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    open: 'Open',
    edit: 'Edit',
    view: 'View',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
    settings: 'Settings',
    help: 'Help',
    contact: 'Contact',
    
    // Messages
    applicationSubmitted: 'Application submitted successfully! We will contact you soon.',
    loginRequired: 'Please login to continue.',
    loginSuccess: 'Login successful!',
    signupSuccess: 'Account created successfully!',
    logoutSuccess: 'Logged out successfully!',
    profileUpdated: 'Profile updated successfully!',
    childAdded: 'Child profile added successfully!',
    childUpdated: 'Child profile updated successfully!',
    childDeleted: 'Child profile deleted successfully!',
    
    // Errors
    errorFetchingData: 'Error fetching data. Please make sure the backend is running.',
    errorLoadingDetails: 'Error loading details. Please try again.',
    errorSubmittingForm: 'Error submitting form. Please try again.',
    errorLogin: 'Login failed. Please check your credentials.',
    errorSignup: 'Signup failed. Please try again.',
    errorUpdatingProfile: 'Error updating profile. Please try again.',
    
    // Loading states
    loadingKindergartens: 'Loading kindergartens...',
    loadingDetails: 'Loading kindergarten details...',
    submittingApplication: 'Submitting application...',
    loggingIn: 'Logging in...',
    signingUp: 'Creating account...',
    updatingProfile: 'Updating profile...',
  },
  tc: {
    // Navigation
    home: '首頁',
    kindergartens: '幼稚園',
    about: '關於',
    profile: '個人資料',
    login: '登入',
    signup: '註冊',
    logout: '登出',
    
    // Home Page
    welcomeTitle: '歡迎來到香港學校申請平台',
    welcomeSubtitle: '尋找並申請香港最佳幼稚園',
    getStarted: '開始使用',
    learnMore: '了解更多',
    
    // Kindergarten List
    hongKongKindergartens: '香港幼稚園',
    findAndExplore: '尋找並探索香港各地的幼稚園',
    searchPlaceholder: '按名稱或地區搜尋...',
    allDistricts: '所有地區',
    clearFilters: '清除篩選',
    showingResults: '顯示 {count} 個，共 {total} 個幼稚園',
    noResults: '沒有找到符合條件的幼稚園。',
    viewDetails: '查看詳情',
    applyNow: '立即申請',
    
    // Kindergarten Detail
    backToKindergartens: '← 返回幼稚園列表',
    schoolNo: '學校編號',
    district: '地區',
    address: '地址',
    phone: '電話',
    website: '網站',
    visitWebsite: '訪問網站',
    organization: '機構',
    startApplication: '開始申請',
    quickFacts: '快速資訊',
    locatedIn: '位於',
    governmentRegistered: '政府註冊',
    professionalStaff: '專業教職員',
    
    // Application Form
    applicationForm: '申請表格',
    childName: '兒童姓名',
    childAge: '兒童年齡',
    parentName: '家長姓名',
    parentEmail: '家長電郵',
    parentPhone: '家長電話',
    preferredStartDate: '首選開學日期',
    additionalNotes: '備註',
    submitApplication: '提交申請',
    cancel: '取消',
    
    // Auth
    email: '電郵',
    password: '密碼',
    confirmPassword: '確認密碼',
    name: '姓名',
    phoneNumber: '電話號碼',
    loginTitle: '登入您的帳戶',
    signupTitle: '創建新帳戶',
    forgotPassword: '忘記密碼？',
    alreadyHaveAccount: '已有帳戶？',
    dontHaveAccount: '沒有帳戶？',
    
    // Profile
    userProfile: '用戶資料',
    childrenProfiles: '兒童資料',
    addChild: '添加兒童',
    editChild: '編輯兒童',
    deleteChild: '刪除兒童',
    childDateOfBirth: '出生日期',
    save: '儲存',
    delete: '刪除',
    
    // Common
    loading: '載入中...',
    error: '錯誤',
    retry: '重試',
    notFound: '找不到',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '關閉',
    open: '開啟',
    edit: '編輯',
    view: '查看',
    search: '搜尋',
    filter: '篩選',
    sort: '排序',
    refresh: '重新整理',
    settings: '設定',
    help: '幫助',
    contact: '聯絡我們',
    
    // Messages
    applicationSubmitted: '申請提交成功！我們會盡快聯絡您。',
    loginRequired: '請登入以繼續。',
    loginSuccess: '登入成功！',
    signupSuccess: '帳戶創建成功！',
    logoutSuccess: '登出成功！',
    profileUpdated: '個人資料更新成功！',
    childAdded: '兒童資料添加成功！',
    childUpdated: '兒童資料更新成功！',
    childDeleted: '兒童資料刪除成功！',
    
    // Errors
    errorFetchingData: '獲取資料時出錯。請確保後端正在運行。',
    errorLoadingDetails: '載入詳情時出錯。請重試。',
    errorSubmittingForm: '提交表格時出錯。請重試。',
    errorLogin: '登入失敗。請檢查您的憑證。',
    errorSignup: '註冊失敗。請重試。',
    errorUpdatingProfile: '更新個人資料時出錯。請重試。',
    
    // Loading states
    loadingKindergartens: '載入幼稚園中...',
    loadingDetails: '載入幼稚園詳情中...',
    submittingApplication: '提交申請中...',
    loggingIn: '登入中...',
    signingUp: '創建帳戶中...',
    updatingProfile: '更新個人資料中...',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'en');

  useEffect(() => {
    localStorage.setItem('lang', language);
  }, [language]);

  const t = (key, params = {}) => {
    let text = translations[language][key] || key;
    
    // Replace parameters in the text
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'tc' : 'en');
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}; 