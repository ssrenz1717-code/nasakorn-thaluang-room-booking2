/** API สำหรับรายการห้องและการจอง — การตัดสินพร้อมเขียนทำภายใน Script Lock */

function publicRoom_(row) {
  return {
    roomId: String(row.roomId), code: String(row.code), name: String(row.name),
    description: String(row.description || ''), location: String(row.location || ''),
    capacity: Number(row.capacity) || 0, equipment: Domain.readList(row, 'equipment'),
    imageUrl: String(row.imageUrl || '') || null, status: String(row.status),
  };
}

function listRooms_(user) {
  return { rooms: readAll_(Domain.SHEET_ROOMS).objects.map(publicRoom_) };
}

function publicBooking_(row) {
  return {
    bookingId: String(row.bookingId), roomId: String(row.roomId), dateKey: Domain.normalizeDateKey(row.dateKey),
    startMin: Number(row.startMin), endMin: Number(row.endMin), status: String(row.status),
    title: String(row.title || ''), bookerName: String(row.bookerName || row.userName),
    userEmail: String(row.userEmail), userName: String(row.userName),
    department: String(row.department || ''), attendees: Number(row.attendees) || 0,
    equipment: Domain.readList(row, 'equipment'), note: String(row.note || ''),
    requesterPosition: String(row.requesterPosition || ''), requesterPhone: String(row.requesterPhone || ''),
    requestedFacilities: Domain.readList(row, 'requestedFacilities'),
    extraFurnitureCount: Number(row.extraFurnitureCount) || 0, otherFacility: String(row.otherFacility || ''),
    termsAccepted: String(row.termsAccepted) === 'true',
    customLocation: String(row.customLocation || ''),
    createdAt: String(row.createdAt || ''),
    approvalStep: Domain.currentApprovalStep({ status: String(row.status), approvalStep: row.approvalStep }),
    approvalLog: Domain.parseApprovalLog(row.approvalLog),
  };
}

function listBookings_(user, payload) {
  const rows = readAll_(Domain.SHEET_BOOKINGS).objects;
  const from = typeof payload.from === 'string' ? payload.from : '';
  const to = typeof payload.to === 'string' ? payload.to : '';
  return { bookings: rows.filter(function (row) {
    return (Domain.canSeeAllBookings(user.role) || String(row.userEmail) === user.email) &&
      (!from || Domain.normalizeDateKey(row.dateKey) >= from) && (!to || Domain.normalizeDateKey(row.dateKey) <= to);
  }).map(publicBooking_) };
}

/**
 * ช่วงเวลาที่ห้องถูกจองไว้ในวันนั้น — ให้ฟอร์มจองบอกผู้ใช้ตั้งแต่ตอนกรอก
 * ทุกคนที่ล็อกอินเรียกได้ เพราะส่งกลับแค่ช่วงเวลาและสถานะ ไม่มีชื่อหรือหัวข้อของใคร
 * การตัดสินจริงยังอยู่ที่ createBooking_ ซึ่งตรวจซ้ำในล็อกเสมอ
 */
function roomAvailability_(user, raw) {
  const parsed = Domain.validateAvailabilityInput(raw);
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, 'ข้อมูลไม่ถูกต้อง', parsed.issues);
  // ห้อง "อื่น ๆ" แต่ละรายการเป็นคนละสถานที่ ไม่มีช่วงที่ชนกัน
  if (Domain.isOpenLocationRoom(findByKey_(Domain.SHEET_ROOMS, parsed.value.roomId))) return { busy: [] };
  const rows = readHotColumns_(Domain.SHEET_BOOKINGS, Domain.BOOKING_HOT_COLUMNS).objects;
  return { busy: Domain.busySlotsFor(rows, parsed.value.roomId, parsed.value.dateKey) };
}

function createBooking_(user, raw) {
  const parsed = Domain.validateBookingRequest(raw);
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, 'ข้อมูลการจองไม่ถูกต้อง', parsed.issues);
  const input = parsed.value;
  if (!input.termsAccepted) throw appError_(ERROR_CODES.VALIDATION, 'กรุณายอมรับเงื่อนไขการใช้ห้องประชุม');
  return withScriptLock_(function () {
    const roomRow = findByKey_(Domain.SHEET_ROOMS, input.roomId);
    if (!roomRow) throw appError_(ERROR_CODES.NOT_FOUND, 'ไม่พบห้องประชุม');
    const room = publicRoom_(roomRow);
    const bookingRows = readAll_(Domain.SHEET_BOOKINGS).objects;
    const activeCount = bookingRows.filter(function (row) {
      return String(row.userEmail) === user.email && ['pending', 'confirmed'].indexOf(String(row.status)) >= 0;
    }).length;
    const ruleResult = Domain.validateBookingRules(input, {
      settings: readSettings_(), room: room, now: serverNow_(), isAdmin: user.role === 'admin',
      activeBookingCount: activeCount,
    });
    if (!ruleResult.ok) throw appError_(ERROR_CODES.VALIDATION, 'ไม่ผ่านเงื่อนไขการจอง', ruleResult.issues);
    const openLocation = Domain.isOpenLocationRoom(room);
    if (openLocation && input.customLocation.trim() === '') {
      throw appError_(ERROR_CODES.VALIDATION, 'กรุณาระบุสถานที่ที่ต้องการใช้');
    }
    const conflicts = openLocation ? [] : bookingRows.filter(function (row) {
      return String(row.roomId) === room.roomId && Domain.normalizeDateKey(row.dateKey) === input.dateKey &&
        ['pending', 'confirmed'].indexOf(String(row.status)) >= 0 &&
        Domain.overlaps(input, { startMin: Number(row.startMin), endMin: Number(row.endMin) });
    });
    if (conflicts.length) throw appError_(ERROR_CODES.CONFLICT, 'ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาใหม่');
    const now = nowIso_();
    const needsApproval = readSettings_().approvalRequired;
    const booking = {
      bookingId: newId_('bk'), roomId: room.roomId, dateKey: input.dateKey,
      startMin: input.startMin, endMin: input.endMin,
      status: needsApproval ? 'pending' : 'confirmed', title: input.title,
      approvalStep: needsApproval ? 1 : 0, approvalLog: '[]', customLocation: openLocation ? input.customLocation : '',
      bookerName: input.bookerName,
      roomCode: room.code, roomName: room.name, userEmail: user.email, userName: user.displayName,
      department: input.department || user.department, attendees: input.attendees,
      equipment: Domain.writeList(input.equipment), note: input.note,
      requesterPosition: input.requesterPosition, requesterPhone: input.requesterPhone,
      requestedFacilities: Domain.writeList(input.requestedFacilities),
      extraFurnitureCount: input.extraFurnitureCount, otherFacility: input.otherFacility,
      termsAccepted: input.termsAccepted, termsAcceptedAt: input.termsAccepted ? now : '',
      durationMin: input.endMin - input.startMin,
      startAt: Domain.fromDateKeyAndMinutes(input.dateKey, input.startMin).toISOString(),
      endAt: Domain.fromDateKeyAndMinutes(input.dateKey, input.endMin).toISOString(),
      createdBy: user.email, createdAt: now, updatedBy: user.email, updatedAt: now,
    };
    appendObject_(Domain.SHEET_BOOKINGS, booking);
    audit_(user.email, 'booking.create', 'booking', booking.bookingId, { roomId: room.roomId, dateKey: input.dateKey });
    bumpDataVersion_();
    return { booking: publicBooking_(booking) };
  });
}

function cancelBooking_(user, payload) {
  return withScriptLock_(function () {
    const row = findByKey_(Domain.SHEET_BOOKINGS, payload.bookingId);
    if (!row) throw appError_(ERROR_CODES.NOT_FOUND, 'ไม่พบรายการจอง');
    if (user.role !== 'admin' && String(row.userEmail) !== user.email) {
      throw appError_(ERROR_CODES.FORBIDDEN, 'ไม่มีสิทธิ์ยกเลิกรายการนี้');
    }
    if (['pending', 'confirmed'].indexOf(String(row.status)) < 0) {
      throw appError_(ERROR_CODES.CONFLICT, 'รายการนี้ยกเลิกไม่ได้');
    }
    const settings = readSettings_();
    const cancelRule = Domain.canCancelBooking({
      startInstant: Domain.fromDateKeyAndMinutes(Domain.normalizeDateKey(row.dateKey), Number(row.startMin)),
      now: serverNow_(), settings: settings, isAdmin: user.role === 'admin',
    });
    if (!cancelRule.ok) throw appError_(ERROR_CODES.FORBIDDEN, cancelRule.message);
    const now = nowIso_();
    updateByKey_(Domain.SHEET_BOOKINGS, payload.bookingId, {
      status: 'cancelled', cancelReason: String(payload.reason || ''), updatedBy: user.email, updatedAt: now,
    });
    audit_(user.email, 'booking.cancel', 'booking', payload.bookingId, { reason: String(payload.reason || '') });
    bumpDataVersion_();
    return { booking: publicBooking_(Object.assign({}, row, { status: 'cancelled' })) };
  });
}

/**
 * ลงนามขั้นปัจจุบันของการอนุมัติ 3 ขั้น — กฎทั้งหมดอยู่ใน Domain.decideApprovalStep
 * (ใครลงนามขั้นไหนได้ ห้ามบัญชีเดียวลงนามซ้ำ ไม่อนุมัติต้องมีเหตุผล)
 */
function decideBooking_(user, raw) {
  const parsed = Domain.validateDecideBookingInput(raw);
  if (!parsed.ok) throw appError_(ERROR_CODES.VALIDATION, 'ข้อมูลการพิจารณาไม่ถูกต้อง', parsed.issues);
  const input = parsed.value;
  return withScriptLock_(function () {
    const row = findByKey_(Domain.SHEET_BOOKINGS, input.bookingId);
    if (!row) throw appError_(ERROR_CODES.NOT_FOUND, 'ไม่พบรายการจอง');
    const now = nowIso_();
    const state = {
      status: String(row.status),
      approvalStep: Domain.currentApprovalStep({ status: String(row.status), approvalStep: row.approvalStep }),
      approvalLog: Domain.parseApprovalLog(row.approvalLog),
    };
    const result = Domain.decideApprovalStep(state, user, input.decision, input.reason, now);
    if (!result.ok) throw appError_(ERROR_CODES[result.code], result.message);
    const patch = {
      status: result.next.status, approvalStep: result.next.approvalStep,
      approvalLog: JSON.stringify(result.next.approvalLog),
      updatedBy: user.email, updatedAt: now,
    };
    if (result.finished) {
      patch.decidedBy = user.email;
      patch.decidedAt = now;
    }
    if (input.decision === 'reject') {
      patch.note = `${String(row.note || '')}${row.note ? '\n' : ''}ผลพิจารณา: ${input.reason}`;
    }
    updateByKey_(Domain.SHEET_BOOKINGS, input.bookingId, patch);
    audit_(user.email, `booking.step${state.approvalStep}.${input.decision}`, 'booking', input.bookingId, { reason: input.reason });
    bumpDataVersion_();
    return { booking: publicBooking_(Object.assign({}, row, patch)), nextStep: result.nextStep };
  });
}
