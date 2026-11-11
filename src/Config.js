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
  SUPPORT_WHATSAPP: '201097865980'
};

/** Tab names. Existing tabs keep their current names. */
var TABS = {
  RIDERS: 'Normal Riders Handle',     // hires exported from Talabat (source of truth)
  HEADCOUNT: 'Headcount',             // IMPORTRANGE — read only, never written
  APPLICANTS: 'New Applicants',       // candidates submitted through the program
  DAILY_ORDERS: 'Daily Orders',       // date | rider code | completed orders
  USERS: 'FS Users',
  SESSIONS: 'FS Sessions',
  CONFIG: 'FS Config',
  TIERS: 'FS Bonus Tiers',
  LOG: 'FS Log',
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
  RIDERS: {
    hireDate: ['تاريخ التعيين', 'Hire Date'],
    code: ['كود المندوب', 'Code', 'Rider Code'],
    name: ['Name', 'الاسم', 'اسم المندوب'],
    zone: ['Zone', 'المنطقة'],
    phone: ['Phone', 'الموبايل'],
    vehicle: ['Vehicle', 'المركبة'],
    orders: ['Orders', 'الأوردرات'],
    referralCode: ['Referral Code', 'مرشح بواسطة (الكود)', 'مرشح بواسطة'],
    referralName: ['Referral Name']
  },
  HEADCOUNT: {
    code: ['Code'],
    name: ['Rider COD Rider Name', 'Name'],
    zone: ['Zone'],
    supervisor: ['SPV', 'Supervisor'],
    manager: ['Manger', 'Manager'],
    phone: ['Phone'],
    vehicle: ['Vehicle'],
    active: ['Active ?', 'Active']
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
    status: ['الحالة'],
    note: ['ملاحظات الإدارة'],
    link: ['لينك الترشيح'],
    refType: ['نوع المرشِّح'],
    statusUpdated: ['آخر تحديث للحالة'],
    hiredCode: ['كود بعد التعيين'],
    hiredDate: ['تاريخ التعيين الفعلي']
  },
  DAILY_ORDERS: {
    date: ['التاريخ', 'Date'],
    code: ['كود المندوب', 'Rider Code', 'Code'],
    orders: ['أوردرات مكتملة', 'Completed Orders', 'Orders']
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
    STATUSES: STATUSES, STATUS_HIRED: STATUS_HIRED, STATUS_REJECTED: STATUS_REJECTED,
    LEGACY_STATUS_MAP: LEGACY_STATUS_MAP
  };
}
