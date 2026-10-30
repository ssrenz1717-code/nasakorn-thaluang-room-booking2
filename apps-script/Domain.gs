var Domain = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // shared/index.ts
  var index_exports = {};
  __export(index_exports, {
    ANNOUNCEMENT_TONES: () => ANNOUNCEMENT_TONES,
    ANNOUNCEMENT_TONE_LABEL_TH: () => ANNOUNCEMENT_TONE_LABEL_TH,
    APPROVAL_STEPS: () => APPROVAL_STEPS,
    BANGKOK_TZ: () => BANGKOK_TZ,
    BOOKING_DECISIONS: () => BOOKING_DECISIONS,
    BOOKING_HOT_COLUMNS: () => BOOKING_HOT_COLUMNS,
    BOOKING_STATUSES: () => BOOKING_STATUSES,
    BOOKING_STATUS_LABEL_TH: () => BOOKING_STATUS_LABEL_TH,
    COLLEGE_ROOMS: () => COLLEGE_ROOMS,
    Check: () => Check,
    DATE_KEY_PATTERN: () => DATE_KEY_PATTERN,
    DEFAULT_SYSTEM_SETTINGS: () => DEFAULT_SYSTEM_SETTINGS,
    LOCK_HOLDING_STATUSES: () => LOCK_HOLDING_STATUSES,
    MINUTES_PER_DAY: () => MINUTES_PER_DAY,
    OPEN_LOCATION_ROOM_CODE: () => OPEN_LOCATION_ROOM_CODE,
    REQUEST_FACILITIES: () => REQUEST_FACILITIES,
    REQUEST_FACILITY_LABEL_TH: () => REQUEST_FACILITY_LABEL_TH,
    ROOM_EQUIPMENT: () => ROOM_EQUIPMENT,
    ROOM_EQUIPMENT_LABEL_TH: () => ROOM_EQUIPMENT_LABEL_TH,
    ROOM_STATUSES: () => ROOM_STATUSES,
    ROOM_STATUS_LABEL_TH: () => ROOM_STATUS_LABEL_TH,
    SETTING_DESCRIPTIONS: () => SETTING_DESCRIPTIONS,
    SHEET_ANNOUNCEMENTS: () => SHEET_ANNOUNCEMENTS,
    SHEET_AUDIT: () => SHEET_AUDIT,
    SHEET_BOOKINGS: () => SHEET_BOOKINGS,
    SHEET_META: () => SHEET_META,
    SHEET_NOTIFICATIONS: () => SHEET_NOTIFICATIONS,
    SHEET_ROOMS: () => SHEET_ROOMS,
    SHEET_SETTINGS: () => SHEET_SETTINGS,
    SHEET_SPECS: () => SHEET_SPECS,
    SHEET_USERS: () => SHEET_USERS,
    USAGE_STATUSES: () => USAGE_STATUSES,
    USER_ROLES: () => USER_ROLES,
    USER_ROLE_LABEL_TH: () => USER_ROLE_LABEL_TH,
    USER_STATUSES: () => USER_STATUSES,
    USER_STATUS_LABEL_TH: () => USER_STATUS_LABEL_TH,
    activeAnnouncements: () => activeAnnouncements,
    addDaysToDateKey: () => addDaysToDateKey,
    asRecord: () => asRecord,
    assertTransition: () => assertTransition,
    bookableDayCount: () => bookableDayCount,
    bookedMinutesWithin: () => bookedMinutesWithin,
    buildHeaderMap: () => buildHeaderMap,
    businessWindow: () => businessWindow,
    busySlotsFor: () => busySlotsFor,
    canCancelBooking: () => canCancelBooking,
    canSeeAllBookings: () => canSeeAllBookings,
    canTransition: () => canTransition,
    computeUtilization: () => computeUtilization,
    conflictingSlots: () => conflictingSlots,
    constantTimeEquals: () => constantTimeEquals,
    countDaysInclusive: () => countDaysInclusive,
    countsAsUsage: () => countsAsUsage,
    createSessionToken: () => createSessionToken,
    currentApprovalStep: () => currentApprovalStep,
    dateKeyRange: () => dateKeyRange,
    dayOfWeekOfDateKey: () => dayOfWeekOfDateKey,
    decideApprovalStep: () => decideApprovalStep,
    findConflicts: () => findConflicts,
    findRowNumber: () => findRowNumber,
    formatTimeOfDay: () => formatTimeOfDay,
    formatUtilization: () => formatUtilization,
    freeGaps: () => freeGaps,
    fromDateKeyAndMinutes: () => fromDateKeyAndMinutes,
    holdsRoomLock: () => holdsRoomLock,
    isAwaitingRole: () => isAwaitingRole,
    isBookableRoomStatus: () => isBookableRoomStatus,
    isEndBlocked: () => isEndBlocked,
    isFinalStatus: () => isFinalStatus,
    isOpenLocationRoom: () => isOpenLocationRoom,
    isStartBlocked: () => isStartBlocked,
    keyValueToObject: () => keyValueToObject,
    mergeIntervals: () => mergeIntervals,
    missingColumns: () => missingColumns,
    normalizeDateKey: () => normalizeDateKey,
    normalizeUserRole: () => normalizeUserRole,
    objectToRow: () => objectToRow,
    overlaps: () => overlaps,
    parseApprovalLog: () => parseApprovalLog,
    parseTimeOfDay: () => parseTimeOfDay,
    readBoolean: () => readBoolean,
    readList: () => readList,
    readNumber: () => readNumber,
    readSettingsOrDefault: () => readSettingsOrDefault,
    readString: () => readString,
    roleForStep: () => roleForStep,
    rowToObject: () => rowToObject,
    rowsToObjects: () => rowsToObjects,
    rowsToSettings: () => rowsToSettings,
    sanitizeForSheet: () => sanitizeForSheet,
    sessionExpiryFrom: () => sessionExpiryFrom,
    settingsToRows: () => settingsToRows,
    sheetSpec: () => sheetSpec,
    stepForRole: () => stepForRole,
    suggestAlternatives: () => suggestAlternatives,
    toDateKey: () => toDateKey,
    toMinutesOfDay: () => toMinutesOfDay,
    tzOffsetMinutes: () => tzOffsetMinutes,
    validateAnnouncementInput: () => validateAnnouncementInput,
    validateAvailabilityInput: () => validateAvailabilityInput,
    validateBookingRequest: () => validateBookingRequest,
    validateBookingRules: () => validateBookingRules,
    validateCancelBookingInput: () => validateCancelBookingInput,
    validateDecideBookingInput: () => validateDecideBookingInput,
    validateRoomInput: () => validateRoomInput,
    validateSetUserRoleInput: () => validateSetUserRoleInput,
    validateSetUserStatusInput: () => validateSetUserStatusInput,
    validateSystemSettings: () => validateSystemSettings,
    validateUserProfileInput: () => validateUserProfileInput,
    verifySessionToken: () => verifySessionToken,
    writeList: () => writeList
  });

  // shared/validate/check.ts
  function asRecord(raw) {
    return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
  }
  var Check = class {
    constructor() {
      __publicField(this, "issues", []);
    }
    get ok() {
      return this.issues.length === 0;
    }
    fail(field, message) {
      this.issues.push({ field, message });
    }
    result(value) {
      return this.ok ? { ok: true, value } : { ok: false, issues: this.issues };
    }
    string(field, raw, options) {
      var _a;
      const { label, fallback } = options;
      if (raw === void 0 || raw === null || raw === "") {
        if (fallback !== void 0) return fallback;
        this.fail(field, `\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01${label}`);
        return "";
      }
      if (typeof raw !== "string") {
        this.fail(field, `${label}\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21`);
        return fallback != null ? fallback : "";
      }
      const value = options.trim === false ? raw : raw.trim();
      if (value === "" && fallback !== void 0) return fallback;
      if (value === "") {
        this.fail(field, `\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01${label}`);
        return "";
      }
      if (options.min !== void 0 && value.length < options.min) {
        this.fail(field, `${label}\u0E15\u0E49\u0E2D\u0E07\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 ${options.min} \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23`);
      }
      if (options.max !== void 0 && value.length > options.max) {
        this.fail(field, `${label}\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19 ${options.max} \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23`);
      }
      if (options.pattern !== void 0 && !options.pattern.test(value)) {
        this.fail(field, (_a = options.patternMessage) != null ? _a : `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A${label}\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`);
      }
      return value;
    }
    integer(field, raw, options) {
      var _a;
      const { label } = options;
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        this.fail(field, `${label}\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02`);
        return (_a = options.min) != null ? _a : 0;
      }
      if (!Number.isInteger(raw)) {
        this.fail(field, `${label}\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E15\u0E47\u0E21`);
        return Math.trunc(raw);
      }
      if (options.min !== void 0 && raw < options.min) {
        this.fail(field, `${label}\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32 ${options.min}`);
      }
      if (options.max !== void 0 && raw > options.max) {
        this.fail(field, `${label}\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 ${options.max}`);
      }
      return raw;
    }
    boolean(field, raw, options) {
      var _a;
      if (typeof raw === "boolean") return raw;
      if (raw === void 0 || raw === null) {
        if (options.fallback !== void 0) return options.fallback;
        this.fail(field, `\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38${options.label}`);
        return false;
      }
      this.fail(field, `${options.label}\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48`);
      return (_a = options.fallback) != null ? _a : false;
    }
    oneOf(field, raw, allowed, options) {
      var _a;
      if (typeof raw === "string" && allowed.includes(raw)) {
        return raw;
      }
      if ((raw === void 0 || raw === null || raw === "") && options.fallback !== void 0) {
        return options.fallback;
      }
      this.fail(field, `${options.label}\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`);
      return (_a = options.fallback) != null ? _a : allowed[0];
    }
    /** รายการค่าจากชุดที่กำหนด — ตัดค่าซ้ำออกและรายงานค่าที่ไม่รู้จัก */
    manyOf(field, raw, allowed, options) {
      if (raw === void 0 || raw === null) return [];
      if (!Array.isArray(raw)) {
        this.fail(field, `${options.label}\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23`);
        return [];
      }
      const picked = [];
      for (const item of raw) {
        if (typeof item === "string" && allowed.includes(item)) {
          if (!picked.includes(item)) picked.push(item);
        } else {
          this.fail(field, `${options.label}\u0E21\u0E35\u0E04\u0E48\u0E32\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01`);
          return picked;
        }
      }
      return picked;
    }
    /** URL หรือ null — ใช้กับรูปภาพห้องที่ไม่บังคับ */
    urlOrNull(field, raw, options) {
      if (raw === void 0 || raw === null || raw === "") return null;
      if (typeof raw !== "string") {
        this.fail(field, `${options.label}\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21`);
        return null;
      }
      const value = raw.trim();
      if (!/^https?:\/\/[^\s]+$/i.test(value)) {
        this.fail(field, `${options.label}\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E23\u0E34\u0E48\u0E21\u0E14\u0E49\u0E27\u0E22 http:// \u0E2B\u0E23\u0E37\u0E2D https://`);
        return null;
      }
      return value;
    }
  };

  // shared/store/table.ts
  function buildHeaderMap(header) {
    const map = {};
    header.forEach((name, index) => {
      if (typeof name === "string" && name !== "") map[name] = index;
    });
    return map;
  }
  function missingColumns(header, required) {
    const map = buildHeaderMap(header);
    return required.filter((name) => map[name] === void 0);
  }
  function rowToObject(row, headerMap) {
    var _a;
    const object = {};
    for (const name of Object.keys(headerMap)) {
      const index = headerMap[name];
      object[name] = index === void 0 ? null : (_a = row[index]) != null ? _a : null;
    }
    return object;
  }
  function rowsToObjects(rows, headerMap) {
    return rows.map((row) => rowToObject(row, headerMap));
  }
  function objectToRow(object, header) {
    return header.map((name) => {
      if (typeof name !== "string") return "";
      const value = object[name];
      if (value === void 0 || value === null) return "";
      return sanitizeForSheet(value);
    });
  }
  var FORMULA_TRIGGERS = ["=", "+", "-", "@", "	", "\r"];
  var TEXT_GUARD = "'";
  function sanitizeForSheet(value) {
    if (typeof value !== "string" || value === "") return value;
    const first = value.charAt(0);
    if (FORMULA_TRIGGERS.indexOf(first) !== -1) return `${TEXT_GUARD}${value}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^0\d+$/.test(value)) return `${TEXT_GUARD}${value}`;
    return value;
  }
  function readString(object, key) {
    const value = object[key];
    if (value === null || value === void 0) return "";
    if (value instanceof Date) return value.toISOString();
    const text = String(value);
    return text.charAt(0) === TEXT_GUARD ? text.substring(1) : text;
  }
  function readNumber(object, key, fallback = 0) {
    const value = object[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  }
  function readBoolean(object, key, fallback = false) {
    const value = object[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "yes" || normalized === "\u0E43\u0E0A\u0E48") return true;
      if (normalized === "false" || normalized === "no" || normalized === "\u0E44\u0E21\u0E48") return false;
    }
    if (typeof value === "number") return value !== 0;
    return fallback;
  }
  function readList(object, key) {
    const raw = readString(object, key);
    if (raw.trim() === "") return [];
    return raw.split(",").map((item) => item.trim()).filter((item) => item !== "");
  }
  function writeList(items) {
    return items.join(",");
  }
  function keyValueToObject(rows, keyIndex = 0, valueIndex = 1) {
    var _a;
    const result = {};
    for (const row of rows) {
      const key = row[keyIndex];
      if (typeof key === "string" && key.trim() !== "") {
        result[key.trim()] = (_a = row[valueIndex]) != null ? _a : null;
      }
    }
    return result;
  }
  function findRowNumber(rows, columnIndex, value, offset = 2) {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row === void 0) continue;
      const cell = row[columnIndex];
      if (cell !== null && cell !== void 0 && String(cell) === value) return i + offset;
    }
    return -1;
  }

  // shared/schemas/settings.ts
  var TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
  var DEFAULT_SYSTEM_SETTINGS = {
    businessHoursStart: "08:00",
    businessHoursEnd: "18:00",
    bookableWeekdays: [1, 2, 3, 4, 5],
    slotMinutes: 15,
    minBookingMinutes: 15,
    maxBookingMinutes: 480,
    minLeadMinutes: 0,
    cancelCutoffMinutes: 0,
    approvalRequired: true,
    allowAdminBackdate: true,
    maxActiveBookingsPerUser: 20,
    reminderLeadMinutes: 15
  };
  function validateSystemSettings(raw) {
    const input = asRecord(raw);
    const check = new Check();
    const businessHoursStart = check.string("businessHoursStart", input.businessHoursStart, {
      label: "\u0E40\u0E27\u0E25\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E33\u0E01\u0E32\u0E23",
      pattern: TIME_PATTERN,
      patternMessage: "\u0E40\u0E27\u0E25\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E33\u0E01\u0E32\u0E23\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A HH:mm \u0E40\u0E0A\u0E48\u0E19 08:30"
    });
    const businessHoursEnd = check.string("businessHoursEnd", input.businessHoursEnd, {
      label: "\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E34\u0E14\u0E17\u0E33\u0E01\u0E32\u0E23",
      pattern: TIME_PATTERN,
      patternMessage: "\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E34\u0E14\u0E17\u0E33\u0E01\u0E32\u0E23\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A HH:mm \u0E40\u0E0A\u0E48\u0E19 18:00"
    });
    const weekdaysRaw = Array.isArray(input.bookableWeekdays) ? input.bookableWeekdays : null;
    const bookableWeekdays = [];
    if (weekdaysRaw === null || weekdaysRaw.length === 0) {
      check.fail("bookableWeekdays", "\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E2B\u0E49\u0E08\u0E2D\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E27\u0E31\u0E19");
    } else {
      for (const day of weekdaysRaw) {
        if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6) {
          check.fail("bookableWeekdays", "\u0E27\u0E31\u0E19\u0E43\u0E19\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 0-6");
          break;
        }
        if (!bookableWeekdays.includes(day)) bookableWeekdays.push(day);
      }
    }
    const slotMinutes = check.integer("slotMinutes", input.slotMinutes, {
      label: "\u0E04\u0E27\u0E32\u0E21\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E02\u0E2D\u0E07\u0E40\u0E27\u0E25\u0E32",
      min: 5,
      max: 60
    });
    const minBookingMinutes = check.integer("minBookingMinutes", input.minBookingMinutes, {
      label: "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33",
      min: 5
    });
    const maxBookingMinutes = check.integer("maxBookingMinutes", input.maxBookingMinutes, {
      label: "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14",
      min: 5
    });
    const value = {
      businessHoursStart,
      businessHoursEnd,
      bookableWeekdays,
      slotMinutes,
      minBookingMinutes,
      maxBookingMinutes,
      minLeadMinutes: check.integer("minLeadMinutes", input.minLeadMinutes, {
        label: "\u0E40\u0E27\u0E25\u0E32\u0E08\u0E2D\u0E07\u0E25\u0E48\u0E27\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33",
        min: 0
      }),
      cancelCutoffMinutes: check.integer("cancelCutoffMinutes", input.cancelCutoffMinutes, {
        label: "\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E40\u0E27\u0E25\u0E32\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01",
        min: 0
      }),
      approvalRequired: check.boolean("approvalRequired", input.approvalRequired, {
        label: "\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"
      }),
      allowAdminBackdate: check.boolean("allowAdminBackdate", input.allowAdminBackdate, {
        label: "\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E08\u0E2D\u0E07\u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25"
      }),
      maxActiveBookingsPerUser: check.integer(
        "maxActiveBookingsPerUser",
        input.maxActiveBookingsPerUser,
        { label: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E04\u0E49\u0E32\u0E07\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14\u0E15\u0E48\u0E2D\u0E04\u0E19", min: 1 }
      ),
      reminderLeadMinutes: check.integer("reminderLeadMinutes", input.reminderLeadMinutes, {
        label: "\u0E40\u0E27\u0E25\u0E32\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21",
        min: 1
      })
    };
    if (TIME_PATTERN.test(businessHoursStart) && TIME_PATTERN.test(businessHoursEnd)) {
      if (businessHoursStart >= businessHoursEnd) {
        check.fail("businessHoursEnd", "\u0E40\u0E27\u0E25\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E33\u0E01\u0E32\u0E23\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E34\u0E14\u0E17\u0E33\u0E01\u0E32\u0E23");
      }
    }
    if (minBookingMinutes > maxBookingMinutes) {
      check.fail("maxBookingMinutes", "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32\u0E02\u0E31\u0E49\u0E19\u0E2A\u0E39\u0E07");
    }
    if (slotMinutes > 0 && minBookingMinutes % slotMinutes !== 0) {
      check.fail("minBookingMinutes", "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E15\u0E31\u0E27\u0E15\u0E32\u0E21\u0E04\u0E27\u0E32\u0E21\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E02\u0E2D\u0E07\u0E40\u0E27\u0E25\u0E32");
    }
    return check.result(value);
  }

  // shared/store/schema.ts
  var SHEET_USERS = "Users";
  var SHEET_ROOMS = "Rooms";
  var SHEET_BOOKINGS = "Bookings";
  var SHEET_NOTIFICATIONS = "Notifications";
  var SHEET_AUDIT = "AuditLogs";
  var SHEET_SETTINGS = "Settings";
  var SHEET_META = "Meta";
  var SHEET_ANNOUNCEMENTS = "Announcements";
  var BOOKING_HOT_COLUMNS = 6;
  var SHEET_SPECS = [
    {
      name: SHEET_USERS,
      keyColumn: "email",
      headers: [
        "email",
        "displayName",
        "department",
        "role",
        "status",
        "tokenVersion",
        "lastLoginAt",
        "createdAt",
        "updatedAt"
      ]
    },
    {
      name: SHEET_ROOMS,
      keyColumn: "roomId",
      headers: [
        "roomId",
        "code",
        "name",
        "description",
        "location",
        "capacity",
        "equipment",
        "imageUrl",
        "status",
        "createdAt",
        "updatedAt"
      ]
    },
    {
      name: SHEET_BOOKINGS,
      keyColumn: "bookingId",
      hotColumns: BOOKING_HOT_COLUMNS,
      headers: [
        // 6 คอลัมน์แรก = ที่ใช้ตรวจทับซ้อน ห้ามสลับลำดับ
        "bookingId",
        "roomId",
        "dateKey",
        "startMin",
        "endMin",
        "status",
        // ที่เหลืออ่านเฉพาะเวลาต้องแสดงรายละเอียด
        "title",
        "roomCode",
        "roomName",
        "userEmail",
        "userName",
        "department",
        "attendees",
        "equipment",
        "note",
        "requesterPosition",
        "requesterPhone",
        "requestedFacilities",
        "extraFurnitureCount",
        "otherFacility",
        "termsAccepted",
        "termsAcceptedAt",
        "durationMin",
        "startAt",
        "endAt",
        "createdBy",
        "createdAt",
        "updatedBy",
        "updatedAt",
        "decidedBy",
        "decidedAt",
        "cancelReason",
        "reminderSentAt",
        "completedAt",
        "bookerName",
        // การอนุมัติ 3 ขั้น: ขั้นที่รออยู่ และประวัติผู้ลงนาม (JSON)
        "approvalStep",
        "approvalLog",
        "customLocation"
      ]
    },
    {
      name: SHEET_NOTIFICATIONS,
      keyColumn: "notificationId",
      headers: [
        "notificationId",
        "userEmail",
        "type",
        "title",
        "body",
        "bookingId",
        "dedupeKey",
        "createdAt",
        "readAt"
      ]
    },
    {
      name: SHEET_AUDIT,
      keyColumn: "auditId",
      headers: ["auditId", "at", "actorEmail", "action", "targetType", "targetId", "detail"]
    },
    {
      name: SHEET_SETTINGS,
      keyColumn: "key",
      headers: ["key", "value", "description"]
    },
    {
      name: SHEET_META,
      keyColumn: "key",
      headers: ["key", "value"]
    },
    {
      name: SHEET_ANNOUNCEMENTS,
      keyColumn: "announcementId",
      headers: ["announcementId", "title", "body", "tone", "expiresOn", "createdBy", "createdAt", "updatedAt", "archivedAt"]
    }
  ];
  function sheetSpec(name) {
    const spec = SHEET_SPECS.find((item) => item.name === name);
    if (spec === void 0) throw new Error(`\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E0A\u0E35\u0E15\u0E0A\u0E37\u0E48\u0E2D "${name}"`);
    return spec;
  }
  var SETTING_DESCRIPTIONS = {
    businessHoursStart: "\u0E40\u0E27\u0E25\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E2B\u0E49\u0E08\u0E2D\u0E07 \u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A HH:mm",
    businessHoursEnd: "\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E34\u0E14\u0E43\u0E2B\u0E49\u0E08\u0E2D\u0E07 \u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A HH:mm",
    bookableWeekdays: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E2B\u0E49\u0E08\u0E2D\u0E07 \u0E04\u0E31\u0E48\u0E19\u0E14\u0E49\u0E27\u0E22\u0E08\u0E38\u0E25\u0E20\u0E32\u0E04 0=\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C \u0E16\u0E36\u0E07 6=\u0E40\u0E2A\u0E32\u0E23\u0E4C",
    slotMinutes: "\u0E04\u0E27\u0E32\u0E21\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E02\u0E2D\u0E07\u0E40\u0E27\u0E25\u0E32 \u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21/\u0E08\u0E1A\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E15\u0E31\u0E27\u0E15\u0E32\u0E21\u0E04\u0E48\u0E32\u0E19\u0E35\u0E49",
    minBookingMinutes: "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33 (\u0E19\u0E32\u0E17\u0E35)",
    maxBookingMinutes: "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 (\u0E19\u0E32\u0E17\u0E35)",
    minLeadMinutes: "\u0E15\u0E49\u0E2D\u0E07\u0E08\u0E2D\u0E07\u0E25\u0E48\u0E27\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E35\u0E48\u0E19\u0E32\u0E17\u0E35 (0 = \u0E08\u0E2D\u0E07\u0E43\u0E0A\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E44\u0E14\u0E49)",
    cancelCutoffMinutes: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E14\u0E49\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E35\u0E48\u0E19\u0E32\u0E17\u0E35",
    approvalRequired: "TRUE = \u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E01\u0E48\u0E2D\u0E19, FALSE = \u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E17\u0E31\u0E19\u0E17\u0E35",
    allowAdminBackdate: "TRUE = \u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E08\u0E2D\u0E07\u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E44\u0E14\u0E49",
    maxActiveBookingsPerUser: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14\u0E15\u0E48\u0E2D\u0E04\u0E19",
    reminderLeadMinutes: "\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E01\u0E35\u0E48\u0E19\u0E32\u0E17\u0E35"
  };
  function settingsToRows(settings) {
    return Object.keys(SETTING_DESCRIPTIONS).map((key) => {
      const value = settings[key];
      const cell = Array.isArray(value) ? value.join(",") : value;
      return [key, cell, SETTING_DESCRIPTIONS[key]];
    });
  }
  function rowsToSettings(rows) {
    const record = keyValueToObject(rows);
    const weekdaysRaw = readString(record, "bookableWeekdays");
    const bookableWeekdays = weekdaysRaw.trim() === "" ? DEFAULT_SYSTEM_SETTINGS.bookableWeekdays : weekdaysRaw.split(",").map((part) => Number(part.trim())).filter((day) => Number.isInteger(day));
    const candidate = {
      businessHoursStart: readString(record, "businessHoursStart") || DEFAULT_SYSTEM_SETTINGS.businessHoursStart,
      businessHoursEnd: readString(record, "businessHoursEnd") || DEFAULT_SYSTEM_SETTINGS.businessHoursEnd,
      bookableWeekdays,
      slotMinutes: readNumber(record, "slotMinutes", DEFAULT_SYSTEM_SETTINGS.slotMinutes),
      minBookingMinutes: readNumber(
        record,
        "minBookingMinutes",
        DEFAULT_SYSTEM_SETTINGS.minBookingMinutes
      ),
      maxBookingMinutes: readNumber(
        record,
        "maxBookingMinutes",
        DEFAULT_SYSTEM_SETTINGS.maxBookingMinutes
      ),
      minLeadMinutes: readNumber(record, "minLeadMinutes", DEFAULT_SYSTEM_SETTINGS.minLeadMinutes),
      cancelCutoffMinutes: readNumber(
        record,
        "cancelCutoffMinutes",
        DEFAULT_SYSTEM_SETTINGS.cancelCutoffMinutes
      ),
      approvalRequired: readBoolean(
        record,
        "approvalRequired",
        DEFAULT_SYSTEM_SETTINGS.approvalRequired
      ),
      allowAdminBackdate: readBoolean(
        record,
        "allowAdminBackdate",
        DEFAULT_SYSTEM_SETTINGS.allowAdminBackdate
      ),
      maxActiveBookingsPerUser: readNumber(
        record,
        "maxActiveBookingsPerUser",
        DEFAULT_SYSTEM_SETTINGS.maxActiveBookingsPerUser
      ),
      reminderLeadMinutes: readNumber(
        record,
        "reminderLeadMinutes",
        DEFAULT_SYSTEM_SETTINGS.reminderLeadMinutes
      )
    };
    return validateSystemSettings(candidate);
  }
  function readSettingsOrDefault(rows) {
    const result = rowsToSettings(rows);
    if (result.ok) return { settings: result.value, problems: [] };
    return {
      settings: DEFAULT_SYSTEM_SETTINGS,
      problems: result.issues.map((issue) => `${issue.field}: ${issue.message}`)
    };
  }

  // shared/schemas/user.ts
  var USER_ROLES = ["admin", "staff", "inspector", "endorser", "director"];
  var USER_ROLE_LABEL_TH = {
    admin: "\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A",
    staff: "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19",
    inspector: "\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2B\u0E49\u0E2D\u0E07",
    endorser: "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07",
    director: "\u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"
  };
  function normalizeUserRole(raw) {
    const value = String(raw != null ? raw : "").trim();
    return USER_ROLES.includes(value) ? value : "staff";
  }
  var USER_STATUSES = ["active", "disabled"];
  var USER_STATUS_LABEL_TH = {
    active: "\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49",
    disabled: "\u0E1B\u0E34\u0E14\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"
  };
  function validateUserProfileInput(raw) {
    const input = asRecord(raw);
    const check = new Check();
    return check.result({
      displayName: check.string("displayName", input.displayName, {
        label: "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25",
        max: 100
      }),
      department: check.string("department", input.department, {
        label: "\u0E41\u0E1C\u0E19\u0E01",
        max: 100,
        fallback: ""
      })
    });
  }
  function validateSetUserRoleInput(raw) {
    const input = asRecord(raw);
    const check = new Check();
    return check.result({
      email: check.string("email", input.email, {
        label: "\u0E2D\u0E35\u0E40\u0E21\u0E25",
        max: 200,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        patternMessage: "\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"
      }),
      role: check.oneOf("role", input.role, USER_ROLES, { label: "\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19" })
    });
  }
  function validateSetUserStatusInput(raw) {
    const input = asRecord(raw);
    const check = new Check();
    return check.result({
      email: check.string("email", input.email, {
        label: "\u0E2D\u0E35\u0E40\u0E21\u0E25",
        max: 200,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        patternMessage: "\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"
      }),
      status: check.oneOf("status", input.status, USER_STATUSES, { label: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49" })
    });
  }

  // shared/auth/session.ts
  var SEPARATOR = "|";
  function payloadString(payload) {
    return [payload.email, payload.role, String(payload.tokenVersion), String(payload.expiresAt)].join(
      SEPARATOR
    );
  }
  function createSessionToken(payload, secret, hmac) {
    if (payload.email.includes(SEPARATOR)) {
      throw new Error("\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E21\u0E35\u0E2D\u0E31\u0E01\u0E02\u0E23\u0E30\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49");
    }
    if (secret === "") {
      throw new Error("\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E01\u0E38\u0E0D\u0E41\u0E08\u0E25\u0E31\u0E1A\u0E02\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E1A");
    }
    const body = payloadString(payload);
    return `${body}${SEPARATOR}${hmac(body, secret)}`;
  }
  function verifySessionToken(token, secret, hmac, nowMs) {
    if (typeof token !== "string" || token === "" || secret === "") {
      return { ok: false, reason: "MALFORMED" };
    }
    const lastSeparator = token.lastIndexOf(SEPARATOR);
    if (lastSeparator <= 0) return { ok: false, reason: "MALFORMED" };
    const body = token.substring(0, lastSeparator);
    const signature = token.substring(lastSeparator + 1);
    const parts = body.split(SEPARATOR);
    if (parts.length !== 4 || signature === "") return { ok: false, reason: "MALFORMED" };
    const [email, role, tokenVersionRaw, expiresAtRaw] = parts;
    if (email === void 0 || email === "" || role === void 0 || !USER_ROLES.includes(role) || tokenVersionRaw === void 0 || expiresAtRaw === void 0) {
      return { ok: false, reason: "MALFORMED" };
    }
    const tokenVersion = Number(tokenVersionRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isInteger(tokenVersion) || !Number.isFinite(expiresAt)) {
      return { ok: false, reason: "MALFORMED" };
    }
    if (!constantTimeEquals(signature, hmac(body, secret))) {
      return { ok: false, reason: "BAD_SIGNATURE" };
    }
    if (nowMs >= expiresAt) return { ok: false, reason: "EXPIRED" };
    return {
      ok: true,
      payload: { email, role, tokenVersion, expiresAt }
    };
  }
  function constantTimeEquals(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }
  function sessionExpiryFrom(nowMs, ttlMs) {
    return nowMs + ttlMs;
  }

  // shared/time/bangkok.ts
  var BANGKOK_TZ = "Asia/Bangkok";
  var MINUTES_PER_DAY = 24 * 60;
  var DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  var PARTS_FORMATTER_CACHE = /* @__PURE__ */ new Map();
  function partsFormatter(timeZone) {
    const cached = PARTS_FORMATTER_CACHE.get(timeZone);
    if (cached) return cached;
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    PARTS_FORMATTER_CACHE.set(timeZone, formatter);
    return formatter;
  }
  function zonedParts(instant, timeZone) {
    const parts = partsFormatter(timeZone).formatToParts(instant);
    const read = (type) => {
      const part = parts.find((p) => p.type === type);
      if (!part) throw new Error(`\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E48\u0E27\u0E19 "${type}" \u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E41\u0E1B\u0E25\u0E07\u0E40\u0E27\u0E25\u0E32 timezone ${timeZone}`);
      return Number(part.value);
    };
    return {
      year: read("year"),
      month: read("month"),
      day: read("day"),
      hour: read("hour"),
      minute: read("minute"),
      second: read("second")
    };
  }
  function tzOffsetMinutes(instant, timeZone = BANGKOK_TZ) {
    const p = zonedParts(instant, timeZone);
    const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const instantToSecond = Math.floor(instant.getTime() / 1e3) * 1e3;
    return (asIfUtc - instantToSecond) / 6e4;
  }
  function parseDateKey(dateKey) {
    if (!DATE_KEY_PATTERN.test(dateKey)) {
      throw new Error(`dateKey \u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A YYYY-MM-DD \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A "${dateKey}"`);
    }
    const year = Number(dateKey.slice(0, 4));
    const month = Number(dateKey.slice(5, 7));
    const day = Number(dateKey.slice(8, 10));
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(`dateKey \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E17\u0E35\u0E48\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E08\u0E23\u0E34\u0E07: "${dateKey}"`);
    }
    return { year, month, day };
  }
  function toDateKey(instant, timeZone = BANGKOK_TZ) {
    const p = zonedParts(instant, timeZone);
    const pad = (n) => String(n).padStart(2, "0");
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  }
  function normalizeDateKey(value, timeZone = BANGKOK_TZ) {
    var _a;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : toDateKey(value, timeZone);
    const text = String(value != null ? value : "").replace(/^'/, "").trim();
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
    return (_a = match == null ? void 0 : match[1]) != null ? _a : text;
  }
  function toMinutesOfDay(instant, timeZone = BANGKOK_TZ) {
    const p = zonedParts(instant, timeZone);
    return p.hour * 60 + p.minute;
  }
  function fromDateKeyAndMinutes(dateKey, minutesOfDay, timeZone = BANGKOK_TZ) {
    if (!Number.isInteger(minutesOfDay)) {
      throw new Error(`minutesOfDay \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E15\u0E47\u0E21 \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${minutesOfDay}`);
    }
    const { year, month, day } = parseDateKey(dateKey);
    const naiveUtc = Date.UTC(year, month - 1, day, 0, 0, 0) + minutesOfDay * 6e4;
    const firstGuess = tzOffsetMinutes(new Date(naiveUtc), timeZone);
    let instant = naiveUtc - firstGuess * 6e4;
    const corrected = tzOffsetMinutes(new Date(instant), timeZone);
    if (corrected !== firstGuess) {
      instant = naiveUtc - corrected * 6e4;
    }
    return new Date(instant);
  }
  function parseTimeOfDay(hhmm) {
    const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
    if (!match) throw new Error(`\u0E40\u0E27\u0E25\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A HH:mm \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A "${hhmm}"`);
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) throw new Error(`\u0E40\u0E27\u0E25\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: "${hhmm}"`);
    return hour * 60 + minute;
  }
  function formatTimeOfDay(minutesOfDay) {
    if (!Number.isInteger(minutesOfDay) || minutesOfDay < 0 || minutesOfDay > MINUTES_PER_DAY) {
      throw new Error(`\u0E19\u0E32\u0E17\u0E35\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 0-${MINUTES_PER_DAY} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${minutesOfDay}`);
    }
    const hour = Math.floor(minutesOfDay / 60);
    const minute = minutesOfDay % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  function addDaysToDateKey(dateKey, days) {
    const { year, month, day } = parseDateKey(dateKey);
    const shifted = new Date(Date.UTC(year, month - 1, day) + days * 864e5);
    const pad = (n) => String(n).padStart(2, "0");
    return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
  }
  function countDaysInclusive(fromDateKey, toDateKey_) {
    const a = parseDateKey(fromDateKey);
    const b = parseDateKey(toDateKey_);
    const diff = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);
    return Math.floor(diff / 864e5) + 1;
  }
  function dayOfWeekOfDateKey(dateKey) {
    const { year, month, day } = parseDateKey(dateKey);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }
  function dateKeyRange(fromDateKey, toDateKey_) {
    const total = countDaysInclusive(fromDateKey, toDateKey_);
    if (total <= 0) return [];
    const keys = [];
    for (let i = 0; i < total; i += 1) keys.push(addDaysToDateKey(fromDateKey, i));
    return keys;
  }

  // shared/domain/overlap.ts
  function overlaps(a, b) {
    return a.startMin < b.endMin && b.startMin < a.endMin;
  }
  function findConflicts(requested, existing, excludeBookingId) {
    return existing.filter(
      (slot) => slot.bookingId !== excludeBookingId && overlaps(requested, slot)
    );
  }
  function mergeIntervals(intervals) {
    if (intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) => a.startMin - b.startMin);
    const merged = [];
    for (const current of sorted) {
      const last = merged[merged.length - 1];
      if (last && current.startMin <= last.endMin) {
        last.endMin = Math.max(last.endMin, current.endMin);
      } else {
        merged.push({ startMin: current.startMin, endMin: current.endMin });
      }
    }
    return merged;
  }
  function freeGaps(busy, window) {
    if (window.endMin <= window.startMin) return [];
    const clipped = mergeIntervals(
      busy.map((slot) => ({
        startMin: Math.max(slot.startMin, window.startMin),
        endMin: Math.min(slot.endMin, window.endMin)
      })).filter((slot) => slot.endMin > slot.startMin)
    );
    const gaps = [];
    let cursor = window.startMin;
    for (const slot of clipped) {
      if (slot.startMin > cursor) gaps.push({ startMin: cursor, endMin: slot.startMin });
      cursor = Math.max(cursor, slot.endMin);
    }
    if (cursor < window.endMin) gaps.push({ startMin: cursor, endMin: window.endMin });
    return gaps;
  }
  function suggestAlternatives(requested, busy, window, options = {}) {
    var _a, _b;
    const stepMin = (_a = options.stepMin) != null ? _a : 15;
    const limit = (_b = options.limit) != null ? _b : 3;
    const durationMin = requested.endMin - requested.startMin;
    if (durationMin <= 0 || stepMin <= 0) return [];
    const candidates = [];
    for (const gap of freeGaps(busy, window)) {
      const first = Math.ceil(gap.startMin / stepMin) * stepMin;
      for (let start = first; start + durationMin <= gap.endMin; start += stepMin) {
        candidates.push({ startMin: start, endMin: start + durationMin });
      }
    }
    const distance = (slot) => Math.abs(slot.startMin - requested.startMin);
    const isLater = (slot) => slot.startMin >= requested.startMin ? 0 : 1;
    return candidates.sort(
      (a, b) => distance(a) - distance(b) || isLater(a) - isLater(b) || a.startMin - b.startMin
    ).slice(0, limit);
  }
  function bookedMinutesWithin(busy, window) {
    return mergeIntervals(busy).map((slot) => Math.min(slot.endMin, window.endMin) - Math.max(slot.startMin, window.startMin)).filter((minutes) => minutes > 0).reduce((sum, minutes) => sum + minutes, 0);
  }

  // shared/domain/status.ts
  var BOOKING_STATUSES = [
    "pending",
    "confirmed",
    "rejected",
    "cancelled",
    "completed"
  ];
  var BOOKING_STATUS_LABEL_TH = {
    pending: "\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34",
    confirmed: "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E41\u0E25\u0E49\u0E27",
    rejected: "\u0E16\u0E39\u0E01\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18",
    cancelled: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E41\u0E25\u0E49\u0E27",
    completed: "\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19"
  };
  var ALLOWED_TRANSITIONS = {
    pending: ["confirmed", "rejected", "cancelled"],
    confirmed: ["cancelled", "completed"],
    rejected: [],
    cancelled: [],
    completed: []
  };
  function canTransition(from, to) {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }
  function assertTransition(from, to) {
    if (!canTransition(from, to)) {
      throw new Error(
        `\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E08\u0E32\u0E01 "${BOOKING_STATUS_LABEL_TH[from]}" \u0E40\u0E1B\u0E47\u0E19 "${BOOKING_STATUS_LABEL_TH[to]}" \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49`
      );
    }
  }
  var LOCK_HOLDING_STATUSES = ["pending", "confirmed"];
  function holdsRoomLock(status) {
    return LOCK_HOLDING_STATUSES.includes(status);
  }
  function isFinalStatus(status) {
    return ALLOWED_TRANSITIONS[status].length === 0;
  }
  var USAGE_STATUSES = ["confirmed", "completed"];
  function countsAsUsage(status) {
    return USAGE_STATUSES.includes(status);
  }

  // shared/domain/availability.ts
  function busySlotsFor(rows, roomId, dateKey, excludeBookingId) {
    return rows.filter(
      (row) => String(row.roomId) === roomId && normalizeDateKey(row.dateKey) === dateKey && LOCK_HOLDING_STATUSES.includes(String(row.status)) && (excludeBookingId === void 0 || String(row.bookingId) !== excludeBookingId)
    ).map((row) => ({
      startMin: Number(row.startMin),
      endMin: Number(row.endMin),
      status: String(row.status)
    })).filter((slot) => Number.isFinite(slot.startMin) && Number.isFinite(slot.endMin)).sort((a, b) => a.startMin - b.startMin);
  }
  function conflictingSlots(requested, busy) {
    return busy.filter((slot) => overlaps(requested, slot));
  }
  function isStartBlocked(startMin, minBookingMinutes, busy) {
    return conflictingSlots({ startMin, endMin: startMin + minBookingMinutes }, busy).length > 0;
  }
  function isEndBlocked(startMin, endMin, busy) {
    return conflictingSlots({ startMin, endMin }, busy).length > 0;
  }

  // shared/schemas/room.ts
  var ROOM_EQUIPMENT = [
    "projector",
    "tv",
    "whiteboard",
    "videoConference",
    "speakerPhone",
    "hdmi"
  ];
  var ROOM_EQUIPMENT_LABEL_TH = {
    projector: "\u0E42\u0E1B\u0E23\u0E40\u0E08\u0E01\u0E40\u0E15\u0E2D\u0E23\u0E4C",
    tv: "\u0E17\u0E35\u0E27\u0E35",
    whiteboard: "\u0E44\u0E27\u0E17\u0E4C\u0E1A\u0E2D\u0E23\u0E4C\u0E14",
    videoConference: "\u0E23\u0E30\u0E1A\u0E1A\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E17\u0E32\u0E07\u0E44\u0E01\u0E25",
    speakerPhone: "\u0E25\u0E33\u0E42\u0E1E\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21",
    hdmi: "\u0E2A\u0E32\u0E22 HDMI"
  };
  var ROOM_STATUSES = ["active", "maintenance", "disabled"];
  var ROOM_STATUS_LABEL_TH = {
    active: "\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19",
    maintenance: "\u0E1B\u0E34\u0E14\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07",
    disabled: "\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E2B\u0E49\u0E08\u0E2D\u0E07"
  };
  function isBookableRoomStatus(status) {
    return status === "active";
  }
  function validateRoomInput(raw) {
    const input = asRecord(raw);
    const check = new Check();
    const value = {
      code: check.string("code", input.code, {
        label: "\u0E23\u0E2B\u0E31\u0E2A\u0E2B\u0E49\u0E2D\u0E07",
        max: 20,
        pattern: /^[A-Za-z0-9-]+$/,
        patternMessage: "\u0E23\u0E2B\u0E31\u0E2A\u0E2B\u0E49\u0E2D\u0E07\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30 A-Z 0-9 \u0E41\u0E25\u0E30\u0E02\u0E35\u0E14\u0E01\u0E25\u0E32\u0E07"
      }),
      name: check.string("name", input.name, { label: "\u0E0A\u0E37\u0E48\u0E2D\u0E2B\u0E49\u0E2D\u0E07", max: 100 }),
      description: check.string("description", input.description, {
        label: "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14",
        max: 500,
        fallback: ""
      }),
      location: check.string("location", input.location, {
        label: "\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07",
        max: 200,
        fallback: ""
      }),
      capacity: check.integer("capacity", input.capacity, {
        label: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E1C\u0E39\u0E49\u0E40\u0E02\u0E49\u0E32\u0E23\u0E48\u0E27\u0E21\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14",
        min: 1,
        max: 1e3
      }),
      equipment: check.manyOf("equipment", input.equipment, ROOM_EQUIPMENT, { label: "\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C" }),
      imageUrl: check.urlOrNull("imageUrl", input.imageUrl, { label: "\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E" }),
      status: check.oneOf("status", input.status, ROOM_STATUSES, {
        label: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E2B\u0E49\u0E2D\u0E07",
        fallback: "active"
      })
    };
    return check.result(value);
  }
  var OPEN_LOCATION_ROOM_CODE = "OTHER";
  function isOpenLocationRoom(room) {
    var _a;
    return String((_a = room == null ? void 0 : room.code) != null ? _a : "").trim().toUpperCase() === OPEN_LOCATION_ROOM_CODE;
  }
  var COLLEGE_ROOMS = [
    { code: "R01", name: "\u0E2B\u0E2D\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E2D\u0E14\u0E34\u0E40\u0E23\u0E01\u0E2A\u0E32\u0E23", capacity: 300 },
    { code: "R02", name: "\u0E2B\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E2A\u0E31\u0E01\u0E17\u0E2D\u0E07", capacity: 40 },
    { code: "R03", name: "\u0E2B\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E49\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E2D\u0E33\u0E19\u0E27\u0E22\u0E01\u0E32\u0E23", capacity: 20 },
    { code: "R04", name: "\u0E2B\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21 (\u0E01\u0E32\u0E41\u0E1F)", capacity: 15 },
    { code: "R05", name: "\u0E2D\u0E32\u0E04\u0E32\u0E23\u0E42\u0E14\u0E21\u0E40\u0E2D\u0E19\u0E01\u0E1B\u0E23\u0E30\u0E2A\u0E07\u0E04\u0E4C", capacity: 500 },
    { code: "R06", name: "\u0E2B\u0E49\u0E2D\u0E07\u0E04\u0E2D\u0E21\u0E1E\u0E34\u0E27\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E01\u0E25\u0E32\u0E07 (\u0E2B\u0E49\u0E2D\u0E07\u0E42\u0E2A\u0E15)", capacity: 40 },
    { code: OPEN_LOCATION_ROOM_CODE, name: "\u0E2D\u0E37\u0E48\u0E19 \u0E46 (\u0E23\u0E30\u0E1A\u0E38\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48)", capacity: 1e3 }
  ];

  // shared/domain/booking-rules.ts
  function validateBookingRules(input, context) {
    const { settings, room, now, isAdmin } = context;
    const issues = [];
    if (!isBookableRoomStatus(room.status)) {
      issues.push({
        code: "ROOM_NOT_BOOKABLE",
        message: "\u0E2B\u0E49\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E2B\u0E49\u0E08\u0E2D\u0E07\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49",
        field: "roomId"
      });
    }
    if (input.endMin <= input.startMin) {
      issues.push({
        code: "TIME_ORDER",
        message: "\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14",
        field: "endMin"
      });
      return { ok: false, issues };
    }
    const durationMin = input.endMin - input.startMin;
    const { slotMinutes } = settings;
    if (input.startMin % slotMinutes !== 0 || input.endMin % slotMinutes !== 0) {
      issues.push({
        code: "TIME_NOT_ALIGNED",
        message: `\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E41\u0E25\u0E30\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E15\u0E31\u0E27\u0E17\u0E38\u0E01 ${slotMinutes} \u0E19\u0E32\u0E17\u0E35`,
        field: "startMin"
      });
    }
    if (durationMin < settings.minBookingMinutes) {
      issues.push({
        code: "DURATION_TOO_SHORT",
        message: `\u0E15\u0E49\u0E2D\u0E07\u0E08\u0E2D\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 ${settings.minBookingMinutes} \u0E19\u0E32\u0E17\u0E35`,
        field: "endMin"
      });
    }
    if (durationMin > settings.maxBookingMinutes) {
      issues.push({
        code: "DURATION_TOO_LONG",
        message: `\u0E08\u0E2D\u0E07\u0E44\u0E14\u0E49\u0E04\u0E23\u0E31\u0E49\u0E07\u0E25\u0E30\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 ${Math.floor(settings.maxBookingMinutes / 60)} \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07`,
        field: "endMin"
      });
    }
    const openMin = parseTimeOfDay(settings.businessHoursStart);
    const closeMin = parseTimeOfDay(settings.businessHoursEnd);
    if (input.startMin < openMin || input.endMin > closeMin) {
      issues.push({
        code: "OUTSIDE_BUSINESS_HOURS",
        message: `\u0E08\u0E2D\u0E07\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E0A\u0E48\u0E27\u0E07 ${formatTimeOfDay(openMin)}-${formatTimeOfDay(closeMin)}`,
        field: "startMin"
      });
    }
    if (!settings.bookableWeekdays.includes(dayOfWeekOfDateKey(input.dateKey))) {
      issues.push({
        code: "DAY_NOT_BOOKABLE",
        message: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E2B\u0E49\u0E08\u0E2D\u0E07",
        field: "dateKey"
      });
    }
    const startInstant = fromDateKeyAndMinutes(input.dateKey, input.startMin);
    const minutesUntilStart = (startInstant.getTime() - now.getTime()) / 6e4;
    const mayBackdate = isAdmin && settings.allowAdminBackdate;
    if (minutesUntilStart < 0 && !mayBackdate) {
      issues.push({
        code: "IN_THE_PAST",
        message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E08\u0E2D\u0E07\u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E44\u0E14\u0E49",
        field: "dateKey"
      });
    } else if (minutesUntilStart >= 0 && minutesUntilStart < settings.minLeadMinutes && !isAdmin) {
      issues.push({
        code: "LEAD_TIME_TOO_SHORT",
        message: `\u0E15\u0E49\u0E2D\u0E07\u0E08\u0E2D\u0E07\u0E25\u0E48\u0E27\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 ${settings.minLeadMinutes} \u0E19\u0E32\u0E17\u0E35`,
        field: "startMin"
      });
    }
    if (input.attendees > room.capacity) {
      issues.push({
        code: "ATTENDEES_EXCEED_CAPACITY",
        message: `\u0E2B\u0E49\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E44\u0E14\u0E49 ${room.capacity} \u0E04\u0E19 \u0E41\u0E15\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E1C\u0E39\u0E49\u0E40\u0E02\u0E49\u0E32\u0E23\u0E48\u0E27\u0E21 ${input.attendees} \u0E04\u0E19`,
        field: "attendees"
      });
    }
    const missing = input.equipment.filter((item) => !room.equipment.includes(item));
    if (missing.length > 0) {
      issues.push({
        code: "EQUIPMENT_UNAVAILABLE",
        message: `\u0E2B\u0E49\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35 ${missing.map((item) => ROOM_EQUIPMENT_LABEL_TH[item]).join(", ")}`,
        field: "equipment"
      });
    }
    if (!isAdmin && context.activeBookingCount >= settings.maxActiveBookingsPerUser) {
      issues.push({
        code: "QUOTA_EXCEEDED",
        message: `\u0E04\u0E38\u0E13\u0E21\u0E35\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E04\u0E23\u0E1A ${settings.maxActiveBookingsPerUser} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27`
      });
    }
    return issues.length === 0 ? { ok: true } : { ok: false, issues };
  }
  function canCancelBooking(params) {
    if (params.isAdmin) return { ok: true };
    const minutesUntilStart = (params.startInstant.getTime() - params.now.getTime()) / 6e4;
    if (minutesUntilStart < 0) {
      return { ok: false, message: "\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E40\u0E23\u0E34\u0E48\u0E21\u0E41\u0E25\u0E49\u0E27 \u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E40\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A" };
    }
    if (minutesUntilStart < params.settings.cancelCutoffMinutes) {
      return {
        ok: false,
        message: `\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E14\u0E49\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 ${params.settings.cancelCutoffMinutes} \u0E19\u0E32\u0E17\u0E35`
      };
    }
    return { ok: true };
  }
  function businessWindow(settings) {
    return {
      startMin: parseTimeOfDay(settings.businessHoursStart),
      endMin: parseTimeOfDay(settings.businessHoursEnd)
    };
  }
  function bookableDayCount(fromDateKey, toDateKey2, settings) {
    return dateKeyRange(fromDateKey, toDateKey2).filter(
      (dateKey) => settings.bookableWeekdays.includes(dayOfWeekOfDateKey(dateKey))
    ).length;
  }

  // shared/domain/utilization.ts
  function computeUtilization(input) {
    const capacityMinutes = Math.max(0, input.activeRoomCount) * Math.max(0, input.bookableMinutesPerDay) * Math.max(0, input.bookableDayCount);
    const bookedMinutes = Math.max(0, input.bookedMinutes);
    if (capacityMinutes === 0) {
      return { rate: null, bookedMinutes, capacityMinutes: 0 };
    }
    return {
      rate: Math.min(1, bookedMinutes / capacityMinutes),
      bookedMinutes,
      capacityMinutes
    };
  }
  function formatUtilization(rate, fractionDigits = 1) {
    if (rate === null) return "\u2013";
    return `${(rate * 100).toFixed(fractionDigits)}%`;
  }

  // shared/domain/approval.ts
  var APPROVAL_STEPS = [
    { step: 1, role: "inspector", action: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2B\u0E49\u0E2D\u0E07", signer: "\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E1C\u0E39\u0E49\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2B\u0E49\u0E2D\u0E07", waiting: "\u0E23\u0E2D\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2B\u0E49\u0E2D\u0E07" },
    { step: 2, role: "endorser", action: "\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07", signer: "\u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E07\u0E32\u0E19 / \u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07", waiting: "\u0E23\u0E2D\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07" },
    { step: 3, role: "director", action: "\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34", signer: "\u0E1C\u0E39\u0E49\u0E1E\u0E34\u0E08\u0E32\u0E23\u0E13\u0E32\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34", waiting: "\u0E23\u0E2D\u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34" }
  ];
  function currentApprovalStep(booking) {
    if (booking.status !== "pending") return 0;
    const step = Number(booking.approvalStep);
    return Number.isInteger(step) && step >= 1 && step <= APPROVAL_STEPS.length ? step : 1;
  }
  function roleForStep(step) {
    var _a, _b;
    return (_b = (_a = APPROVAL_STEPS.find((item) => item.step === step)) == null ? void 0 : _a.role) != null ? _b : null;
  }
  function stepForRole(role) {
    var _a, _b;
    return (_b = (_a = APPROVAL_STEPS.find((item) => item.role === role)) == null ? void 0 : _a.step) != null ? _b : 0;
  }
  function canSeeAllBookings(role) {
    return role !== "staff";
  }
  function isAwaitingRole(booking, role) {
    const step = currentApprovalStep(booking);
    return step > 0 && roleForStep(step) === role;
  }
  function parseApprovalLog(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "string" || raw.trim() === "") return [];
    try {
      const parsed = JSON.parse(raw.replace(/^'/, ""));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function decideApprovalStep(booking, actor, decision, reason, nowIso) {
    const step = currentApprovalStep(booking);
    if (step === 0) return { ok: false, code: "CONFLICT", message: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34" };
    const stepInfo = APPROVAL_STEPS[step - 1];
    if (actor.role !== stepInfo.role) {
      return { ok: false, code: "FORBIDDEN", message: `\u0E02\u0E31\u0E49\u0E19\u0E19\u0E35\u0E49 (${stepInfo.action}) \u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E19\u0E32\u0E21\u0E42\u0E14\u0E22${stepInfo.signer}` };
    }
    const email = actor.email.toLowerCase();
    if (booking.approvalLog.some((entry2) => entry2.email.toLowerCase() === email)) {
      return { ok: false, code: "FORBIDDEN", message: "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E25\u0E07\u0E19\u0E32\u0E21\u0E43\u0E19\u0E02\u0E31\u0E49\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E15\u0E48\u0E25\u0E30\u0E02\u0E31\u0E49\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E19\u0E25\u0E30\u0E1A\u0E31\u0E0D\u0E0A\u0E35" };
    }
    const trimmed = reason.trim();
    if (decision === "reject" && trimmed === "") {
      return { ok: false, code: "VALIDATION", message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34" };
    }
    const entry = { step, decision, email: actor.email, name: actor.displayName, at: nowIso, reason: trimmed };
    const approvalLog = [...booking.approvalLog, entry];
    if (decision === "reject") {
      return { ok: true, next: { status: "rejected", approvalStep: 0, approvalLog }, finished: true, nextStep: 0 };
    }
    if (step === APPROVAL_STEPS.length) {
      return { ok: true, next: { status: "confirmed", approvalStep: 0, approvalLog }, finished: true, nextStep: 0 };
    }
    return { ok: true, next: { status: "pending", approvalStep: step + 1, approvalLog }, finished: false, nextStep: step + 1 };
  }

  // shared/schemas/booking.ts
  var REQUEST_FACILITIES = ["projector", "soundSystem", "microphone", "airConditioning", "internet"];
  var REQUEST_FACILITY_LABEL_TH = {
    projector: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E09\u0E32\u0E22\u0E20\u0E32\u0E1E (Projector)",
    soundSystem: "\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E2A\u0E35\u0E22\u0E07",
    microphone: "\u0E44\u0E21\u0E42\u0E04\u0E23\u0E42\u0E1F\u0E19",
    airConditioning: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E1B\u0E23\u0E31\u0E1A\u0E2D\u0E32\u0E01\u0E32\u0E28",
    internet: "\u0E2D\u0E34\u0E19\u0E40\u0E17\u0E2D\u0E23\u0E4C\u0E40\u0E19\u0E47\u0E15"
  };
  function validateBookingRequest(raw) {
    var _a;
    const input = asRecord(raw);
    const check = new Check();
    const startMin = check.integer("startMin", input.startMin, {
      label: "\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21",
      min: 0,
      max: MINUTES_PER_DAY - 1
    });
    const endMin = check.integer("endMin", input.endMin, {
      label: "\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14",
      min: 1,
      max: MINUTES_PER_DAY
    });
    const value = {
      bookerName: check.string("bookerName", input.bookerName, { label: "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E08\u0E2D\u0E07", max: 100 }),
      title: check.string("title", input.title, { label: "\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19", min: 1, max: 200 }),
      roomId: check.string("roomId", input.roomId, { label: "\u0E2B\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21" }),
      dateKey: check.string("dateKey", input.dateKey, {
        label: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48",
        pattern: DATE_KEY_PATTERN,
        patternMessage: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A YYYY-MM-DD"
      }),
      startMin,
      endMin,
      attendees: check.integer("attendees", input.attendees, {
        label: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E1C\u0E39\u0E49\u0E40\u0E02\u0E49\u0E32\u0E23\u0E48\u0E27\u0E21",
        min: 1
      }),
      department: check.string("department", input.department, {
        label: "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19 / \u0E2A\u0E32\u0E02\u0E32\u0E27\u0E34\u0E0A\u0E32",
        min: 1,
        max: 100
      }),
      requesterPosition: check.string("requesterPosition", input.requesterPosition, {
        label: "\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07",
        min: 1,
        max: 100
      }),
      // เบอร์มือถือ เบอร์โต๊ะ หรือเบอร์ภายใน (เช่น "ต่อ 123") — ตรวจแค่ว่าเป็นตัวเลขกับเครื่องหมายที่ใช้เขียนเบอร์
      requesterPhone: check.string("requesterPhone", input.requesterPhone, {
        label: "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C",
        min: 3,
        max: 30,
        pattern: /^[0-9+()\-.\s]*(?:ต่อ\s*[0-9]+)?$/,
        patternMessage: "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E43\u0E2A\u0E48\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 \u0E40\u0E0A\u0E48\u0E19 081-234-5678 \u0E2B\u0E23\u0E37\u0E2D \u0E15\u0E48\u0E2D 123"
      }),
      note: check.string("note", input.note, {
        label: "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21",
        max: 1e3,
        fallback: ""
      }),
      equipment: check.manyOf("equipment", input.equipment, ROOM_EQUIPMENT, {
        label: "\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23"
      }),
      requestedFacilities: check.manyOf("requestedFacilities", input.requestedFacilities, REQUEST_FACILITIES, {
        label: "\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E17\u0E35\u0E48\u0E02\u0E2D\u0E43\u0E0A\u0E49"
      }),
      extraFurnitureCount: check.integer("extraFurnitureCount", (_a = input.extraFurnitureCount) != null ? _a : 0, {
        label: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E42\u0E15\u0E4A\u0E30/\u0E40\u0E01\u0E49\u0E32\u0E2D\u0E35\u0E49\u0E40\u0E2A\u0E23\u0E34\u0E21",
        min: 0,
        max: 500
      }),
      otherFacility: check.string("otherFacility", input.otherFacility, {
        label: "\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E2D\u0E37\u0E48\u0E19 \u0E46",
        max: 300,
        fallback: ""
      }),
      customLocation: check.string("customLocation", input.customLocation, { label: "\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2D\u0E07", max: 200, fallback: "" }),
      termsAccepted: check.boolean("termsAccepted", input.termsAccepted, {
        label: "\u0E01\u0E32\u0E23\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02",
        fallback: false
      })
    };
    if (endMin <= startMin) {
      check.fail("endMin", "\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14");
    }
    return check.result(value);
  }
  function validateCancelBookingInput(raw) {
    const input = asRecord(raw);
    const check = new Check();
    return check.result({
      bookingId: check.string("bookingId", input.bookingId, { label: "\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07" }),
      reason: check.string("reason", input.reason, { label: "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25", max: 500, fallback: "" })
    });
  }
  var BOOKING_DECISIONS = ["approve", "reject"];
  function validateDecideBookingInput(raw) {
    const input = asRecord(raw);
    const check = new Check();
    return check.result({
      bookingId: check.string("bookingId", input.bookingId, { label: "\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07" }),
      decision: check.oneOf("decision", input.decision, BOOKING_DECISIONS, { label: "\u0E01\u0E32\u0E23\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19" }),
      reason: check.string("reason", input.reason, { label: "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25", max: 500, fallback: "" })
    });
  }
  function validateAvailabilityInput(raw) {
    const input = asRecord(raw);
    const check = new Check();
    return check.result({
      roomId: check.string("roomId", input.roomId, { label: "\u0E2B\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21" }),
      dateKey: check.string("dateKey", input.dateKey, {
        label: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48",
        pattern: DATE_KEY_PATTERN,
        patternMessage: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A YYYY-MM-DD"
      })
    });
  }

  // shared/schemas/announcement.ts
  var ANNOUNCEMENT_TONES = ["info", "notice", "urgent"];
  var ANNOUNCEMENT_TONE_LABEL_TH = {
    info: "\u0E02\u0E48\u0E32\u0E27\u0E2A\u0E32\u0E23\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B",
    notice: "\u0E41\u0E08\u0E49\u0E07\u0E43\u0E2B\u0E49\u0E17\u0E23\u0E32\u0E1A",
    urgent: "\u0E14\u0E48\u0E27\u0E19 / \u0E2B\u0E49\u0E2D\u0E07\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"
  };
  function validateAnnouncementInput(raw) {
    var _a;
    const input = asRecord(raw);
    const check = new Check();
    return check.result({
      announcementId: check.string("announcementId", input.announcementId, { label: "\u0E23\u0E2B\u0E31\u0E2A\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28", max: 80, fallback: "" }),
      title: check.string("title", input.title, { label: "\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28", min: 1, max: 120 }),
      body: check.string("body", input.body, { label: "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", max: 1e3, fallback: "" }),
      tone: check.oneOf("tone", (_a = input.tone) != null ? _a : "info", ANNOUNCEMENT_TONES, { label: "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28" }),
      expiresOn: check.string("expiresOn", input.expiresOn, {
        label: "\u0E41\u0E2A\u0E14\u0E07\u0E16\u0E36\u0E07\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48",
        fallback: "",
        pattern: /^(|\d{4}-\d{2}-\d{2})$/,
        patternMessage: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A YYYY-MM-DD"
      })
    });
  }
  function activeAnnouncements(items, todayKey) {
    const rank = { urgent: 0, notice: 1, info: 2 };
    return items.filter((item) => item.archivedAt === "" && (item.expiresOn === "" || !DATE_KEY_PATTERN.test(item.expiresOn) || item.expiresOn >= todayKey)).sort((a, b) => rank[a.tone] - rank[b.tone] || b.createdAt.localeCompare(a.createdAt));
  }
  return __toCommonJS(index_exports);
})();
