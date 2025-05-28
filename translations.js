// translations.js
const translations = {
    en: {
        // Header
        appName: "Airoscan",
        university: "Tishk International University",
        
        // Main title
        airQualityMonitor: "Air Quality Monitor",
        airQuality: "Air Quality",
        monitor: "Monitor",
        subtitle: "Real-time PM2.5 concentration data from monitoring stations in Erbil, Kurdistan Region",
        
        // Health guide banner
        learnAboutAirQuality: "Learn About Air Quality",
        understandPM25: "Understand how PM2.5 affects your health and how to protect yourself",
        healthGuide: "Health Guide",
        
        // Section titles
        makhmor: "Makhmor Road",
        naznaz: "Naznaz Area",
        sensor: "Sensor",
        trends: "Trends",
        pm25Trends: "PM2.5 Concentration Trends",
        map: "Map",
        
        // Card titles
        currentPM25: "Current PM2.5",
        average24hr: "24hr Average",
        lastUpdated: "Last Updated",
        sensorStatus: "Sensor Status",
        
        // Time ranges
        "24h": "24h",
        "7d": "7d",
        "30d": "30d",
        
        // Status
        loading: "Loading...",
        updating: "Updating...",
        online: "Online",
        offline: "Offline",
        unknown: "Unknown",
        noData: "No Data",
        
        // Air quality status
        good: "Good",
        moderate: "Moderate",
        unhealthySensitive: "Unhealthy for Sensitive Groups",
        unhealthy: "Unhealthy",
        veryUnhealthy: "Very Unhealthy",
        hazardous: "Hazardous",
        
        // Descriptions
        avgLast24: "Average over the last 24 hours",
        sensorConnection: "Sensor connection status",
        noHealthImpacts: "Air quality is satisfactory - No health impacts expected",
        
        // Table headers
        id: "ID",
        location: "Location",
        timestamp: "Timestamp",
        status: "Status",
        
        // Averages section
        averages: "Averages",
        
        // Prediction section
        forecast7Day: "7-DAY PM2.5 FORECAST WITH CONFIDENCE",
        confidence: "Confidence",
        highConfidence: "High confidence based on recent patterns.",
        moderateConfidence: "Moderate confidence; patterns may vary.",
        patternMatch: "Pattern match with some day last week.",
        similarRecent: "Similar to recent days, less historical data.",
        weeklyAverage: "Based on weekly average patterns.",
        limitedData: "Limited historical data available.",
        processingData: "Prediction data processing or insufficient data.",
        forecastUnavailable: "7-Day PM2.5 Forecast data is currently unavailable. Please check back later.",
        
        // Units
        microgramUnit: "μg/m³",
        microgramPM25: "μg/m³ PM2.5",
        percentHumidity: "% Humidity",
        
        // Time
        justNow: "Just now",
        secondsAgo: "s ago",
        minutesAgo: "m ago",
        hoursAgo: "h ago",
        daysAgo: "d ago",
        asOf: "As of",
        invalidDate: "Invalid date",
        
        // Footer
        copyright: "© 2025 Air Quality Monitoring System - Tishk International University",
        
        // Days of week
        sun: "Sun",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
        
        // Error messages
        errorLoadingData: "Failed to refresh data. Please check the console for details.",
        databaseConfigError: "Database configuration not found. Please reload the page.",
        databaseClientError: "Database client is not available. Check console for initialization errors.",
        databaseQueryFailed: "Database query failed",
        noReadingsFound: "No readings found in database",
        
        // Pagination
        showing: "Showing",
        of: "of",
        prev: "Previous",
        next: "Next",
        noDataAvailable: "No data available for this filter.",
        
        // PM2.5 Effects Page
        backToDashboard: "Back to Dashboard",
        understandingPM25: "Understanding PM2.5 Air Pollution",
        essentialInfo: "Essential information about fine particulate matter and its impact on health",
        whatIsPM25: "What is PM2.5?",
        whyItMatters: "Why It Matters",
        protection: "Protection",
        pm25Description: "Microscopic particles less than 2.5 micrometers in diameter that can penetrate deep into lungs",
        healthProblems: "Can cause serious health problems including heart disease, lung cancer, and respiratory issues",
        protectionMeasures: "Monitor air quality, wear N95 masks when needed, and use air purifiers indoors",
        pm25Scale: "PM2.5 Concentration Scale",
        epaStandards: "Based on US EPA Air Quality Index (AQI) standards",
        acceptable: "Acceptable - Unusually sensitive people should consider limiting prolonged outdoor exertion",
        sensitiveGroups: "People with heart/lung disease, children, and older adults should limit prolonged outdoor exertion",
        everyoneAffected: "Everyone may experience health effects; sensitive groups should avoid outdoor exertion",
        healthAlert: "Health alert - Everyone should avoid all outdoor exertion",
        healthEmergency: "Health emergency - Everyone should avoid all outdoor activity",
        healthEffects: "Health Effects",
        protectionTitle: "Protection Measures",
        shortTermExposure: "Short-term Exposure",
        longTermExposure: "Long-term Exposure",
        outdoorProtection: "Outdoor Protection",
        indoorProtection: "Indoor Protection",
        commonSources: "Common Sources in Kurdistan",
        vehicleEmissions: "Vehicle Emissions",
        industry: "Industry",
        construction: "Construction",
        burning: "Burning",
        stayInformed: "Stay Informed, Stay Safe",
        monitorRealTime: "Monitor real-time air quality data from our sensors across Erbil",
        viewLiveData: "View Live Air Quality Data",
        references: "References & Sources"
    },
    ku: {
        // Kurdish (Sorani) translations
        appName: "ئایرۆسکان",
        university: "زانکۆی نێودەوڵەتی تیشک",
        
        airQualityMonitor: "چاودێری کوالیتی هەوا",
        airQuality: "کوالیتی هەوا",
        monitor: "چاودێری",
        subtitle: "داتای PM2.5 لە کاتی ڕاستەقینەدا لە وێستگەکانی چاودێری لە هەولێر، هەرێمی کوردستان",
        
        learnAboutAirQuality: "فێربوون دەربارەی کوالیتی هەوا",
        understandPM25: "تێبگە چۆن PM2.5 کاریگەری لەسەر تەندروستیت دەکات و چۆن خۆت بپارێزیت",
        healthGuide: "ڕێنمایی تەندروستی",
        
        makhmor: "ڕێگای مەخموور",
        naznaz: "ناوچەی نازناز",
        sensor: "هەستەوەر",
        trends: "ڕەوتەکان",
        pm25Trends: "ڕەوتی چڕی PM2.5",
        map: "نەخشە",
        
        currentPM25: "PM2.5ی ئێستا",
        average24hr: "تێکڕای ٢٤ کاتژمێر",
        lastUpdated: "دوایین نوێکردنەوە",
        sensorStatus: "دۆخی هەستەوەر",
        
        "24h": "٢٤ک",
        "7d": "٧ڕ",
        "30d": "٣٠ڕ",
        
        loading: "چاوەڕوان بە...",
        updating: "نوێکردنەوە...",
        online: "سەرهێڵ",
        offline: "دەرهێڵ",
        unknown: "نەزانراو",
        noData: "داتا نییە",
        
        good: "باش",
        moderate: "مامناوەند",
        unhealthySensitive: "نەخۆش بۆ گروپە هەستیارەکان",
        unhealthy: "نەخۆش",
        veryUnhealthy: "زۆر نەخۆش",
        hazardous: "مەترسیدار",
        
        avgLast24: "تێکڕا لە ماوەی ٢٤ کاتژمێری ڕابردوو",
        sensorConnection: "دۆخی پەیوەندی هەستەوەر",
        noHealthImpacts: "کوالیتی هەوا گونجاوە - هیچ کاریگەرییەکی تەندروستی چاوەڕوان ناکرێت",
        
        id: "ناسنامە",
        location: "شوێن",
        timestamp: "کات",
        status: "دۆخ",
        
        averages: "تێکڕاکان",
        
        forecast7Day: "پێشبینی PM2.5 بۆ ٧ ڕۆژ لەگەڵ متمانە",
        confidence: "متمانە",
        highConfidence: "متمانەی بەرز بەپێی نموونەکانی نزیک.",
        moderateConfidence: "متمانەی مامناوەند؛ نموونەکان دەکرێت جیاواز بن.",
        patternMatch: "لەگەڵ ڕۆژێکی هەفتەی ڕابردوو دەگونجێت.",
        similarRecent: "هاوشێوەی ڕۆژانی نزیک، داتای مێژوویی کەمتر.",
        weeklyAverage: "بەپێی تێکڕای نموونەکانی هەفتانە.",
        limitedData: "داتای مێژوویی سنووردار بەردەستە.",
        processingData: "پرۆسێسکردنی داتای پێشبینی یان داتای ناتەواو.",
        forecastUnavailable: "داتای پێشبینی PM2.5 بۆ ٧ ڕۆژ لە ئێستادا بەردەست نییە. تکایە دواتر سەردان بکەرەوە.",
        
        microgramUnit: "مایکرۆگرام/م³",
        microgramPM25: "مایکرۆگرام/م³ PM2.5",
        percentHumidity: "% شێ",
        
        justNow: "هەر ئێستا",
        secondsAgo: "چ پێش",
        minutesAgo: "خ پێش",
        hoursAgo: "ک پێش",
        daysAgo: "ڕ پێش",
        asOf: "لە",
        invalidDate: "بەروار نادروستە",
        
        copyright: "© ٢٠٢٥ سیستەمی چاودێری کوالیتی هەوا - زانکۆی نێودەوڵەتی تیشک",
        
        sun: "یەکشەممە",
        mon: "دووشەممە",
        tue: "سێشەممە",
        wed: "چوارشەممە",
        thu: "پێنجشەممە",
        fri: "هەینی",
        sat: "شەممە",
        
        errorLoadingData: "نەتوانرا داتا نوێ بکرێتەوە. تکایە کۆنسۆڵ بپشکنە بۆ وردەکاری.",
        databaseConfigError: "ڕێکخستنی داتابەیس نەدۆزرایەوە. تکایە پەڕەکە نوێ بکەرەوە.",
        databaseClientError: "کلاینتی داتابەیس بەردەست نییە. کۆنسۆڵ بپشکنە بۆ هەڵەکانی دەستپێکردن.",
        databaseQueryFailed: "پرسیاری داتابەیس سەرکەوتوو نەبوو",
        noReadingsFound: "هیچ خوێندنەوەیەک لە داتابەیس نەدۆزرایەوە",
        
        showing: "پیشاندانی",
        of: "لە",
        prev: "پێشوو",
        next: "دواتر",
        noDataAvailable: "هیچ داتایەک بەردەست نییە بۆ ئەم فلتەرە.",
        
        backToDashboard: "بگەڕێوە بۆ داشبۆرد",
        understandingPM25: "تێگەیشتن لە پیسبوونی هەوای PM2.5",
        essentialInfo: "زانیاری پێویست دەربارەی تەنۆلکە وردەکان و کاریگەرییان لەسەر تەندروستی",
        whatIsPM25: "PM2.5 چییە؟",
        whyItMatters: "بۆچی گرنگە",
        protection: "پاراستن",
        pm25Description: "تەنۆلکەی مایکرۆسکۆپی کەمتر لە ٢.٥ مایکرۆمەتر تیرە کە دەتوانێت بچێتە ناو سییەکان",
        healthProblems: "دەتوانێت کێشەی تەندروستی جدی دروست بکات وەک نەخۆشی دڵ، شێرپەنجەی سی، و کێشەی هەناسەدان",
        protectionMeasures: "چاودێری کوالیتی هەوا بکە، دەمامکی N95 لەبەر بکە کاتێک پێویستە، و پاککەرەوەی هەوا بەکاربهێنە لە ژوورەوە",
        pm25Scale: "پێوەری چڕی PM2.5",
        epaStandards: "بەپێی ستانداردەکانی پێوەری کوالیتی هەوای EPA ی ئەمریکا",
        acceptable: "پەسەندکراو - کەسانی زۆر هەستیار دەبێت بیر لە سنووردارکردنی ماندووبوونی درێژخایەن لە دەرەوە بکەنەوە",
        sensitiveGroups: "کەسانی تووشی نەخۆشی دڵ/سی، منداڵان، و بەساڵاچووان دەبێت ماندووبوونی درێژخایەن لە دەرەوە سنووردار بکەن",
        everyoneAffected: "هەموو کەسێک دەکرێت کاریگەری تەندروستی هەست پێ بکات؛ گروپە هەستیارەکان دەبێت لە ماندووبوونی دەرەوە دوور بکەونەوە",
        healthAlert: "ئاگاداری تەندروستی - هەموو کەسێک دەبێت لە هەموو ماندووبوونێکی دەرەوە دوور بکەوێتەوە",
        healthEmergency: "فریاکەوتنی تەندروستی - هەموو کەسێک دەبێت لە هەموو چالاکییەکی دەرەوە دوور بکەوێتەوە",
        healthEffects: "کاریگەرییە تەندروستییەکان",
        protectionTitle: "ڕێکارەکانی پاراستن",
        shortTermExposure: "بەرکەوتنی کورت مەودا",
        longTermExposure: "بەرکەوتنی درێژ مەودا",
        outdoorProtection: "پاراستن لە دەرەوە",
        indoorProtection: "پاراستن لە ژوورەوە",
        commonSources: "سەرچاوە باوەکان لە کوردستان",
        vehicleEmissions: "دەردانی ئۆتۆمبێل",
        industry: "پیشەسازی",
        construction: "بیناسازی",
        burning: "سووتاندن",
        stayInformed: "ئاگادار بە، سەلامەت بە",
        monitorRealTime: "چاودێری داتای کوالیتی هەوا بکە لە کاتی ڕاستەقینەدا لە هەستەوەرەکانمان لە سەرانسەری هەولێر",
        viewLiveData: "بینینی داتای ڕاستەوخۆی کوالیتی هەوا",
        references: "سەرچاوەکان"
    },
    ar: {
        // Arabic translations
        appName: "إيروسكان",
        university: "جامعة تيشك الدولية",
        
        airQualityMonitor: "مراقب جودة الهواء",
        airQuality: "جودة الهواء",
        monitor: "مراقب",
        subtitle: "بيانات تركيز PM2.5 في الوقت الفعلي من محطات المراقبة في أربيل، إقليم كردستان",
        
        learnAboutAirQuality: "تعرف على جودة الهواء",
        understandPM25: "افهم كيف يؤثر PM2.5 على صحتك وكيفية حماية نفسك",
        healthGuide: "دليل الصحة",
        
        makhmor: "طريق مخمور",
        naznaz: "منطقة نازناز",
        sensor: "مستشعر",
        trends: "الاتجاهات",
        pm25Trends: "اتجاهات تركيز PM2.5",
        map: "خريطة",
        
        currentPM25: "PM2.5 الحالي",
        average24hr: "متوسط 24 ساعة",
        lastUpdated: "آخر تحديث",
        sensorStatus: "حالة المستشعر",
        
        "24h": "24س",
        "7d": "7ي",
        "30d": "30ي",
        
        loading: "جار التحميل...",
        updating: "جار التحديث...",
        online: "متصل",
        offline: "غير متصل",
        unknown: "غير معروف",
        noData: "لا توجد بيانات",
        
        good: "جيد",
        moderate: "معتدل",
        unhealthySensitive: "غير صحي للمجموعات الحساسة",
        unhealthy: "غير صحي",
        veryUnhealthy: "غير صحي جداً",
        hazardous: "خطر",
        
        avgLast24: "المتوسط خلال آخر 24 ساعة",
        sensorConnection: "حالة اتصال المستشعر",
        noHealthImpacts: "جودة الهواء مرضية - لا توجد آثار صحية متوقعة",
        
        id: "المعرف",
        location: "الموقع",
        timestamp: "الوقت",
        status: "الحالة",
        
        averages: "المتوسطات",
        
        forecast7Day: "توقعات PM2.5 لمدة 7 أيام مع الثقة",
        confidence: "الثقة",
        highConfidence: "ثقة عالية بناءً على الأنماط الحديثة.",
        moderateConfidence: "ثقة متوسطة؛ قد تختلف الأنماط.",
        patternMatch: "تطابق النمط مع يوم ما الأسبوع الماضي.",
        similarRecent: "مشابه للأيام الأخيرة، بيانات تاريخية أقل.",
        weeklyAverage: "بناءً على متوسط الأنماط الأسبوعية.",
        limitedData: "البيانات التاريخية المحدودة متاحة.",
        processingData: "معالجة بيانات التنبؤ أو بيانات غير كافية.",
        forecastUnavailable: "بيانات توقعات PM2.5 لمدة 7 أيام غير متاحة حالياً. يرجى المحاولة لاحقاً.",
        
        microgramUnit: "ميكروغرام/م³",
        microgramPM25: "ميكروغرام/م³ PM2.5",
        percentHumidity: "% رطوبة",
        
        justNow: "الآن",
        secondsAgo: "ث مضت",
        minutesAgo: "د مضت",
        hoursAgo: "س مضت",
        daysAgo: "ي مضت",
        asOf: "اعتباراً من",
        invalidDate: "تاريخ غير صالح",
        
        copyright: "© 2025 نظام مراقبة جودة الهواء - جامعة تيشك الدولية",
        
        sun: "الأحد",
        mon: "الإثنين",
        tue: "الثلاثاء",
        wed: "الأربعاء",
        thu: "الخميس",
        fri: "الجمعة",
        sat: "السبت",
        
        errorLoadingData: "فشل تحديث البيانات. يرجى التحقق من وحدة التحكم للحصول على التفاصيل.",
        databaseConfigError: "لم يتم العثور على تكوين قاعدة البيانات. يرجى إعادة تحميل الصفحة.",
        databaseClientError: "عميل قاعدة البيانات غير متاح. تحقق من وحدة التحكم لأخطاء التهيئة.",
        databaseQueryFailed: "فشل استعلام قاعدة البيانات",
        noReadingsFound: "لم يتم العثور على قراءات في قاعدة البيانات",
        
        showing: "عرض",
        of: "من",
        prev: "السابق",
        next: "التالي",
        noDataAvailable: "لا توجد بيانات متاحة لهذا الفلتر.",
        
        backToDashboard: "العودة إلى لوحة القيادة",
        understandingPM25: "فهم تلوث الهواء PM2.5",
        essentialInfo: "معلومات أساسية حول الجسيمات الدقيقة وتأثيرها على الصحة",
        whatIsPM25: "ما هو PM2.5؟",
        whyItMatters: "لماذا هو مهم",
        protection: "الحماية",
        pm25Description: "جسيمات مجهرية أقل من 2.5 ميكرومتر في القطر يمكن أن تخترق عميقاً في الرئتين",
        healthProblems: "يمكن أن يسبب مشاكل صحية خطيرة بما في ذلك أمراض القلب وسرطان الرئة ومشاكل الجهاز التنفسي",
        protectionMeasures: "راقب جودة الهواء، ارتدِ أقنعة N95 عند الحاجة، واستخدم أجهزة تنقية الهواء في الداخل",
        pm25Scale: "مقياس تركيز PM2.5",
        epaStandards: "بناءً على معايير مؤشر جودة الهواء لوكالة حماية البيئة الأمريكية",
        acceptable: "مقبول - يجب على الأشخاص الحساسين بشكل غير عادي التفكير في الحد من الجهد المطول في الهواء الطلق",
        sensitiveGroups: "يجب على الأشخاص المصابين بأمراض القلب/الرئة والأطفال وكبار السن الحد من الجهد المطول في الهواء الطلق",
        everyoneAffected: "قد يعاني الجميع من آثار صحية؛ يجب على المجموعات الحساسة تجنب الجهد في الهواء الطلق",
        healthAlert: "تنبيه صحي - يجب على الجميع تجنب كل الجهد في الهواء الطلق",
        healthEmergency: "طوارئ صحية - يجب على الجميع تجنب كل الأنشطة في الهواء الطلق",
        healthEffects: "الآثار الصحية",
        protectionTitle: "تدابير الحماية",
        shortTermExposure: "التعرض قصير المدى",
        longTermExposure: "التعرض طويل المدى",
        outdoorProtection: "الحماية في الهواء الطلق",
        indoorProtection: "الحماية في الداخل",
        commonSources: "المصادر الشائعة في كردستان",
        vehicleEmissions: "انبعاثات المركبات",
        industry: "الصناعة",
        construction: "البناء",
        burning: "الحرق",
        stayInformed: "ابق على اطلاع، ابق آمناً",
        monitorRealTime: "راقب بيانات جودة الهواء في الوقت الفعلي من أجهزة الاستشعار لدينا في جميع أنحاء أربيل",
        viewLiveData: "عرض بيانات جودة الهواء المباشرة",
        references: "المراجع والمصادر"
    }
};

// Language management functions
let currentLanguage = localStorage.getItem('language') || 'en';

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar' || lang === 'ku') ? 'rtl' : 'ltr';
    
    // Update all translatable elements
    updateTranslations();
    
    // Update language button states
    updateLanguageButtons();
    
    // Trigger any necessary UI updates
    if (window.refreshData) {
        window.refreshData();
    }
}

function t(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

function updateTranslations() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });
    
    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
    
    // Update document title
    document.title = t('appName') + ' - ' + t('subtitle').substring(0, 50) + '...';
}

function updateLanguageButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === currentLanguage) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setLanguage(currentLanguage);
});

// Export for use in other scripts
window.translations = translations;
window.t = t;
window.setLanguage = setLanguage;
window.currentLanguage = currentLanguage;
window.updateTranslations = updateTranslations;