/**
 * จัดการบัญชีผู้ใช้ — เรียกได้เฉพาะผู้ดูแลระบบ (ตรวจด้วย requireAdmin_ ที่ 50_Api.gs)
 *
 * กฎที่ทุกคำสั่งในไฟล์นี้ต้องรักษา:
 *  - ต้องเหลือผู้ดูแลที่ใช้งานได้อย่างน้อย 1 คนเสมอ (Domain.lastAdminProblem)
 *  - ผู้ดูแลลบหรือปิดบัญชีตัวเองไม่ได้ (กันล็อกตัวเองออกโดยไม่ตั้งใจ)
 *  - ไม่ส่ง pinHash/pinSalt กลับหน้าเว็บเลย (publicUser_ ตัดออกให้แล้ว)
 */

function adminUserView_(row) {
  return Object.assign(publicUser_(row), {
    hasPin: String(row.pinHash || '') !== '',
    lastLoginAt: String(row.lastLoginAt || ''),
    createdAt: String(row.createdAt || ''),
  });
}

function userRows_() {
  return readAll_(Domain.SHEET_USERS).objects.map(function (row) {
    return { username: String(row.username), role: String(row.role), status: String(row.status), row: row };
  });
}

function listUsers_() {
  return { users: readAll_(Domain.SHEET_USERS).objects.map(adminUserView_) };
}

function parseAccount_(raw, requirePin) {
  const parsed = Domain.validateUserAccountInput(raw, { requirePin: requirePin });
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, 'ข้อมูลผู้ใช้ไม่ถูกต้อง', parsed.issues);
  return parsed.value;
}

function createUser_(admin, raw) {
  const input = parseAccount_(raw, true);
  return withScriptLock_(function () {
    if (findByKey_(Domain.SHEET_USERS, input.username) !== null) {
      throw appError_(ERROR_CODES.CONFLICT, `มีชื่อผู้ใช้ "${input.username}" อยู่แล้ว`);
    }
    const now = nowIso_();
    const row = Object.assign({
      username: input.username, displayName: input.displayName, department: input.department,
      role: input.role, status: input.status, allowedRoomIds: Domain.writeList(input.allowedRoomIds),
      tokenVersion: 1, lastLoginAt: '', createdAt: now, updatedAt: now,
    }, newPinCredential_(input.username, input.pin));
    appendObject_(Domain.SHEET_USERS, row);
    audit_(admin.email, 'user.create', 'user', input.username, { role: input.role });
    return { user: adminUserView_(row) };
  });
}

function updateUser_(admin, raw) {
  const input = parseAccount_(raw, false);
  return withScriptLock_(function () {
    const users = userRows_();
    const current = users.filter(function (user) { return user.username === input.username; })[0];
    if (!current) throw appError_(ERROR_CODES.NOT_FOUND, 'ไม่พบผู้ใช้');
    if (input.username === admin.email && (input.status !== 'active' || input.role !== 'admin')) {
      throw appError_(ERROR_CODES.CONFLICT, 'ลดสิทธิ์หรือปิดบัญชีของตัวเองไม่ได้ ให้ผู้ดูแลคนอื่นทำแทน');
    }
    const problem = Domain.lastAdminProblem(users, input.username, { role: input.role, status: input.status });
    if (problem !== null) throw appError_(ERROR_CODES.CONFLICT, problem);

    const patch = {
      displayName: input.displayName, department: input.department, role: input.role, status: input.status,
      allowedRoomIds: Domain.writeList(input.allowedRoomIds), updatedAt: nowIso_(),
    };
    updateByKey_(Domain.SHEET_USERS, input.username, patch);
    audit_(admin.email, 'user.update', 'user', input.username, { role: input.role, status: input.status });
    bumpDataVersion_();
    return { user: adminUserView_(Object.assign({}, current.row, patch)) };
  });
}

/** ตั้ง PIN ใหม่ให้ผู้ใช้ — session เดิมทุกเครื่องของคนนั้นหลุดทันที (บวก tokenVersion) */
function resetUserPin_(admin, raw) {
  const parsed = Domain.validateResetPinInput(raw);
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, 'PIN ใหม่ใช้ไม่ได้', parsed.issues);
  const input = parsed.value;
  return withScriptLock_(function () {
    const row = findByKey_(Domain.SHEET_USERS, input.username);
    if (row === null) throw appError_(ERROR_CODES.NOT_FOUND, 'ไม่พบผู้ใช้');
    const patch = Object.assign(newPinCredential_(input.username, input.pin), {
      tokenVersion: (Number(row.tokenVersion) || 1) + 1, updatedAt: nowIso_(),
    });
    updateByKey_(Domain.SHEET_USERS, input.username, patch);
    CacheService.getScriptCache().remove(pinFailureKey_(input.username));
    audit_(admin.email, 'user.resetPin', 'user', input.username, {});
    return { ok: true };
  });
}

/** ลบบัญชี — รายการจองเก่ายังอยู่ (เก็บชื่อผู้จองไว้ในแถวการจองแล้ว) */
function deleteUser_(admin, payload) {
  const username = Domain.normalizeUsername(payload && payload.username);
  if (username === admin.email) throw appError_(ERROR_CODES.CONFLICT, 'ลบบัญชีของตัวเองไม่ได้');
  return withScriptLock_(function () {
    const users = userRows_();
    if (!users.some(function (user) { return user.username === username; })) {
      throw appError_(ERROR_CODES.NOT_FOUND, 'ไม่พบผู้ใช้');
    }
    const problem = Domain.lastAdminProblem(users, username, null);
    if (problem !== null) throw appError_(ERROR_CODES.CONFLICT, problem);
    deleteByKey_(Domain.SHEET_USERS, username);
    audit_(admin.email, 'user.delete', 'user', username, {});
    bumpDataVersion_();
    return { ok: true };
  });
}
