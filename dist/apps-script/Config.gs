/**
 * Full Speed Champions — configuration.
 *
 * Values here are defaults. Anything in the "FS Config" tab overrides them,
 * so the operations team can change the season, the window or the nudge
 * delay without touching code. Bonus tiers live in the "FS Bonus Tiers" tab.
 */

var APP = {
  // The spreadsheet the program is linked to. If the script is bound to the
  // sheet (Extensions → Apps Script), this can be left empty.
  SHEET_ID: '1CGf_CJLStWuRAHp6dNc3Ty1FJoHLDl7sRIqMno_NS54',

  NAME: 'Full Speed Champions',
  SLOGAN: 'Not Just faster, Smarter'
};

/** Defaults for the "FS Config" tab (key → value). */
var CONFIG_DEFAULTS = {
  PROGRAM_START_DATE: '2026-11-01',   // hires before this day are ignored
  BONUS_WINDOW_MONTHS: 2,             // calendar months from the hire date
  NUDGE_AFTER_DAYS: 3,                // flag a stuck candidate after N days
  COMPANY_REF_CODE: '3901026',        // the shared Talabat code external partners use
  TALABAT_REF_BASE: 'https://rider-eg.talabat.com/?utm_source=raf&utm_medium=raf&utm_campaign=raf&utm_content=raf_',
  SESSION_DAYS: 7,
  MAX_LOGIN_FAILURES: 5,              // then the account is locked for LOCK_MINUTES
  LOCK_MINUTES: 15,
  PUBLIC_APPLY_PER_HOUR: 30,          // per referral link
  MIN_PASSWORD_LENGTH: 6,
  SUPPORT_WHATSAPP: '201120339097',
  PUBLIC_APP_URL: 'https://mohamedmostafay08-gif.github.io/full-speed-champions/',  // the installable app (GitHub Pages)
  // Where the Google link reads its interface from. Empty = use the Index.html saved in Apps Script.
  ANNOUNCEMENT: '',                   // banner shown to every rider in the app (empty = none)
  REPORT_EMAILS: '',                  // comma-separated: who gets the daily report email
  UI_SOURCE_URL: 'https://raw.githubusercontent.com/mohamedmostafay08-gif/full-speed-champions/main/dist/single-file/Index.html'
};

/** Tab names. Existing tabs keep their current names. */
var TABS = {
  HIRING: 'Hiring tracker',           // daily raw export of hires: official hire date, SV, SP status
  RIDERS: 'Normal Riders Handle',     // Talabat export: the referral code of each hire
  HEADCOUNT: 'Headcount',             // IMPORTRANGE — read only, never written
  APPLICANTS: 'New Applicants',       // candidates submitted through the program
  DAILY_ORDERS: 'Daily Orders',       // date | rider code | completed orders
  USERS: 'FS Users',
  SESSIONS: 'FS Sessions',
  CONFIG: 'FS Config',
  TIERS: 'FS Bonus Tiers',
  LOG: 'FS Log',
  ADMINS: 'FS Admins',                // the operations team (admin dashboard accounts)
  PAYOUTS: 'FS Payouts',              // one row per bonus paid
  AUDIT: 'FS Audit',                  // who changed what, from the admin dashboard
  CAMPAIGNS: 'FS Campaigns',          // extra-bonus campaigns
  // Legacy tabs, read once by the migration and then left untouched.
  LEGACY_PASSWORDS: 'Passwords',
  LEGACY_PARTNERS: 'External Partners',
  LEGACY_SESSIONS: 'Sessions'
};

/**
 * Column headers, matched by name (case, spaces and punctuation ignored),
 * never by position — inserting a column in the sheet no longer breaks
 * anything. The first name is the one the setup writes.
 */
var COLUMNS = {
  HIRING: {
    hireDate: ['Dates', 'Date', 'Hire Date', 'تاريخ التعيين'],
    code: ['Rider ID', 'Code', 'Rider Code', 'كود المندوب'],
    zone: ['Zones', 'Zone', 'المنطقة'],
    name: ['Rider Name', 'Name', 'الاسم'],
    phone: ['Phone Number', 'Phone', 'الموبايل'],
    status: ['Status', 'الحالة'],
    sv: ['SV', 'SPV', 'Supervisor'],
    sp: ['Has SP', 'SP Status', 'SP'],
    vehicle: ['Vehicle', 'المركبة']
  },
  RIDERS: {
    hireDate: ['تاريخ التعيين', 'Hire Date'],
    code: ['كود المندوب', 'Code', 'Rider Code'],
    name: ['Name', 'الاسم', 'اسم المندوب'],
    zone: ['Zone', 'المنطقة'],
    phone: ['Phone', 'الموبايل'],
    vehicle: ['Vehicle', 'المركبة'],
    orders: ['Orders', 'الأوردرات'],
    referralCode: ['Referral Code', 'مرشح بواسطة (الكود)', 'مرشح بواسطة'],
    referralName: ['Referral Name'],
    batch: ['Batch NO', 'Batch']
  },
  HEADCOUNT: {
    code: ['Code'],
    name: ['Rider COD Rider Name', 'Name'],
    zone: ['Zone'],
    supervisor: ['SPV', 'Supervisor'],
    manager: ['Manger', 'Manager'],
    phone: ['Phone'],
    vehicle: ['Vehicle'],
    active: ['Active ?', 'Active'],
    spStatus: ['SP Status'],
    batch: ['Batch NO', 'Batch']
  },
  APPLICANTS: {
    timestamp: ['Timestamp', 'تاريخ التقديم'],
    refCode: ['Referral Code', 'كود المرشِّح'],
    name: ['الاسم الرباعي'],
    phone: ['الموبايل'],
    nationalId: ['الرقم القومي'],
    address: ['العنوان'],
    zone: ['المنطقة'],
    licenseExpiry: ['انتهاء الرخصة'],
    idExpiry: ['انتهاء البطاقة'],
    birthDate: ['تاريخ الميلاد'],
    plate: ['اللوحة'],
    vehicle: ['نوع المركبة'],
    status: ['الحالة'],
    note: ['ملاحظات الإدارة'],
    link: ['لينك الترشيح'],
    refType: ['نوع المرشِّح'],
    statusUpdated: ['آخر تحديث للحالة'],
    hiredCode: ['كود بعد التعيين'],
    hiredDate: ['تاريخ التعيين الفعلي']
  },
  DAILY_ORDERS: {
    date: ['التاريخ', 'Date', 'Dates', 'Day', 'اليوم'],
    code: ['كود المندوب', 'Rider Code', 'Rider ID', 'Code', 'ID', 'الكود'],
    orders: ['أوردرات مكتملة', 'Completed Orders', 'Orders', 'Completed', 'عدد الأوردرات', 'الأوردرات', 'Order Count']
  },
  USERS: {
    type: ['Type'],
    code: ['Code'],
    name: ['Name'],
    phone: ['Phone'],
    refId: ['Ref ID'],
    hash: ['Password Hash'],
    status: ['Status'],
    created: ['Created'],
    lastLogin: ['Last Login']
  },
  ADMINS: {
    username: ['Username'], name: ['Name'], role: ['Role'], hash: ['Password Hash'],
    status: ['Status'], mustChange: ['Must Change Password'], created: ['Created'], lastLogin: ['Last Login']
  },
  PAYOUTS: {
    id: ['Payout ID'], riderCode: ['Rider Code'], riderName: ['Rider Name'], ownerKey: ['Referrer'],
    ownerName: ['Referrer Name'], amount: ['Amount'], method: ['Method'], reference: ['Reference'],
    note: ['Note'], paidBy: ['Paid By'], paidAt: ['Paid At'], status: ['Status'], approvedBy: ['Approved By'], approvedAt: ['Approved At']
  },
  CAMPAIGNS: {
    id: ['Campaign ID'], name: ['Name'], start: ['Start'], end: ['End'], zone: ['Zone'], extra: ['Extra Bonus'], active: ['Active']
  },
  SESSIONS: {
    tokenHash: ['Token Hash'],
    code: ['Code'],
    type: ['Type'],
    created: ['Created'],
    expires: ['Expires']
  }
};

/**
 * Candidate pipeline. The order is the timeline shown to the referrer.
 * "اشتغل" is also set automatically once the candidate's phone appears in
 * the riders tab (see syncApplicants).
 */
var STATUSES = ['جديد', 'تم التواصل', 'قيد التعيين', 'تم حضور المحاضرة', 'اشتغل', 'مرفوض'];
var STATUS_HIRED = 'اشتغل';
var STATUS_REJECTED = 'مرفوض';

/**
 * Admin roles. Each permission lists the roles allowed to do it; every
 * role can read the dashboard.
 */
var ROLES = {
  owner: 'مدير',
  recruiter: 'فريق التعيينات',
  finance: 'الحسابات',
  viewer: 'مشاهد'
};
var PERMISSIONS = {
  'applicants.edit': ['owner', 'recruiter'],
  'users.edit': ['owner', 'recruiter'],
  'payouts.approve': ['owner'],
  'payouts.edit': ['owner', 'finance'],
  'campaigns.edit': ['owner'],
  'settings.edit': ['owner'],
  'team.edit': ['owner']
};
var PAYOUT_METHODS = ['كاش', 'فودافون كاش', 'إنستاباي', 'تحويل بنكي', 'مع المرتب', 'أخرى'];

/** Values found in the old sheet, mapped onto the new pipeline. */
var LEGACY_STATUS_MAP = {
  'ارفع استمارة': 'جديد',            // candidate just recruited, form not processed yet
  'ارفع استعلام': 'جديد',            // same stage, spelling found in the live sheet
  'تم التعيين': 'اشتغل',
  'شغال': 'اشتغل',
  'استلم ونزل': 'اشتغل',
  'معلق': 'مرفوض'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    APP: APP, CONFIG_DEFAULTS: CONFIG_DEFAULTS, TABS: TABS, COLUMNS: COLUMNS,
    STATUSES: STATUSES, ROLES: ROLES, PERMISSIONS: PERMISSIONS, PAYOUT_METHODS: PAYOUT_METHODS, STATUS_HIRED: STATUS_HIRED, STATUS_REJECTED: STATUS_REJECTED,
    LEGACY_STATUS_MAP: LEGACY_STATUS_MAP
  };
}
