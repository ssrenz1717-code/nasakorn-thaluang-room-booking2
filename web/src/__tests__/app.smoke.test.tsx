import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { AppProvider } from '../app/providers/AppProvider';
import { ToastProvider } from '../components/ui/Toast';
import { addDaysToDateKey, dayOfWeekOfDateKey, toDateKey } from '@shared/time/bangkok';
import { DEMO_LOGINS } from '../lib/api/demo';

/**
 * เทสว่าหน้าเว็บ "รันได้จริง" ไม่ใช่แค่ build ผ่าน
 *
 * build ผ่านบอกได้แค่ว่า type ถูกและ bundle สำเร็จ ไม่ได้บอกว่าเปิดมาแล้วไม่จอขาว
 * เทสนี้เดินเส้นทางจริงของผู้ใช้ตั้งแต่เปิดเว็บจนถึงแต่ละหน้า
 *
 * ไม่ได้ตั้ง VITE_API_URL ในเทส ระบบจึงเข้าโหมดสาธิตเอง
 * เหมือนตอนเปิดจาก GitHub Pages ก่อนตั้งค่า Apps Script เสร็จ
 */

function renderApp() {
  return render(
    <HashRouter>
      <ToastProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ToastProvider>
    </HashRouter>,
  );
}

const PINS: Record<string, string> = Object.fromEntries(DEMO_LOGINS.map((login) => [login.username, login.pin]));
const PASSWORDS: Record<string, string> = Object.fromEntries(DEMO_LOGINS.map((login) => [login.username, login.password]));

/** เข้าทางชื่อผู้ใช้ + รหัสผ่าน (ต้องอยู่ที่หน้าเข้าสู่ระบบแล้ว) */
async function enterPassword(username: string, password = PASSWORDS[username] ?? '') {
  fireEvent.click(await screen.findByRole('tab', { name: 'ชื่อผู้ใช้และรหัสผ่าน' }, { timeout: 5000 }));
  fireEvent.change(screen.getByLabelText('ชื่อผู้ใช้'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
}

/** เข้าทาง PIN อย่างเดียว — ครบ 6 หลักแล้วระบบส่งเอง */
async function enterPinOnly(pin: string) {
  fireEvent.click(await screen.findByRole('tab', { name: 'PIN' }, { timeout: 5000 }));
  fireEvent.change(await screen.findByLabelText(/^PIN/), { target: { value: pin } });
}

/** เข้าสู่ระบบด้วยรหัสผ่าน แล้วรอจนเห็นเมนูหลัก */
async function signInAs(username: string, password = PASSWORDS[username] ?? '') {
  await enterPassword(username, password);
  return screen.findByRole('navigation', { name: 'เมนูหลัก' }, { timeout: 5000 });
}

/** กดลงนามแล้วยืนยันด้วย PIN ในหน้าต่างที่เด้งขึ้น */
async function signWithPin(user: ReturnType<typeof userEvent.setup>, button: HTMLElement, pin: string) {
  await user.click(button);
  const dialog = await screen.findByRole('dialog', { name: 'ยืนยันการลงนามด้วย PIN' });
  fireEvent.change(within(dialog).getByLabelText(/^PIN/), { target: { value: pin } });
  await user.click(within(dialog).getByRole('button', { name: 'ลงนาม' }));
}

/** เปิดเว็บแล้วเข้าระบบ (ค่าเริ่มต้น: ผู้ดูแล shoyu) — ถ้ายังมี session ค้างจะเข้าหน้าหลักเลย */
async function openApp(username = 'shoyu') {
  const user = userEvent.setup();
  renderApp();
  await waitFor(() => {
    expect(screen.queryByLabelText('ชื่อผู้ใช้') ?? screen.queryByRole('navigation', { name: 'เมนูหลัก' })).not.toBeNull();
  }, { timeout: 5000 });
  const nav = screen.queryByRole('navigation', { name: 'เมนูหลัก' }) ?? await signInAs(username);
  return { user, nav };
}

async function signOutVia(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { expanded: false, name: /ผู้ดูแลระบบ|ผู้ใช้งาน|ผู้รับรอง|ผู้อนุมัติ|เจ้าหน้าที่ตรวจห้อง/ }));
  await user.click(screen.getByRole('menuitem', { name: /ออกจากระบบ/ }));
  await screen.findByRole('heading', { level: 1, name: 'เข้าสู่ระบบ' });
}

async function goTo(user: ReturnType<typeof userEvent.setup>, nav: HTMLElement, label: string) {
  await user.click(within(nav).getByRole('link', { name: label }));
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeDefined());
}

afterEach(() => {
  // ต้องเรียก cleanup เองเพราะตั้ง globals: false ไว้
  cleanup();
  window.localStorage.clear();
  window.location.hash = '';
});

describe('เปิดเว็บโดยยังไม่ได้ตั้งค่าเซิร์ฟเวอร์', () => {
  it('เปิดมาเจอหน้าเข้าสู่ระบบ ใส่ชื่อผู้ใช้กับ PIN แล้วเข้าได้', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { level: 1, name: 'เข้าสู่ระบบ' }, { timeout: 5000 })).toBeDefined();
    await signInAs('shoyu');

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('ระบบจองห้องประชุมออนไลน์');
  });

  it('ไม่มีคำว่าโหมดสาธิตหรือแถบเตือนข้อมูลตัวอย่างหลงเหลืออยู่', async () => {
    await openApp();

    expect(screen.queryByText(/สาธิต/)).toBeNull();
    expect(screen.queryByText(/ข้อมูลทั้งหมดเป็นตัวอย่าง/)).toBeNull();
  });
});

describe('หน้าภาพรวม', () => {
  it('แสดงกฎการจองจากค่าตั้งค่าที่เซิร์ฟเวอร์ส่งมา ไม่ใช่ค่าที่ฝังในหน้าเว็บ', async () => {
    await openApp();

    expect(screen.getByText('ทุก 15 นาที')).toBeDefined();
    expect(screen.getByText('20 รายการ')).toBeDefined();
    expect(screen.getByText(/เปิด — ต้องรออนุมัติ/)).toBeDefined();
    expect(screen.getByText('จ. อ. พ. พฤ. ศ.')).toBeDefined();
  });

  it('ยังไม่ต่อเซิร์ฟเวอร์ ไม่แสดงปุ่มตรวจการเชื่อมต่อและการ์ดสถานะระบบ', async () => {
    await openApp();

    expect(screen.queryByRole('button', { name: /ตรวจการเชื่อมต่อ/ })).toBeNull();
    expect(screen.queryByText('สถานะระบบ')).toBeNull();
  });

  it('ตัวเลขบนการ์ดสรุปนับขึ้นไปจนถึงค่าจริง', async () => {
    await openApp();

    // ข้อมูลตั้งต้นมีรายการที่อนุมัติแล้ว 7 รายการ (รวมที่ประชุมไปแล้ว 3) ผู้เข้าร่วม 120+12+30+10 + 15+40+50 = 277 คน — ตัวเลขที่มองเห็น (aria-hidden) ต้องหยุดที่ 277
    const label = await screen.findByText('ผู้เข้าใช้รวม');
    const card = label.parentElement!;
    await waitFor(
      () => expect(card.querySelector('strong [aria-hidden="true"]')?.textContent).toBe('277'),
      { timeout: 3000 },
    );
  });
});

describe('เมนูและการเข้าถึงหน้าต่าง ๆ', () => {
  it('หน้าที่ทำเสร็จแล้วเปิดได้จริงทุกหน้า', async () => {
    const { user, nav } = await openApp();

    for (const label of ['จองห้องประชุม', 'ปฏิทินการจอง', 'รายการจองของฉัน', 'ห้องประชุม']) {
      await goTo(user, nav, label);
      // ถ้าหน้าพังจะเจอหน้า "ไม่พบหน้าที่คุณเรียก" แทน
      expect(screen.queryByText(/ไม่พบหน้าที่คุณเรียก/)).toBeNull();
    }
  });

  it('ไม่มีเมนูหรือปุ่มที่ยังทำไม่เสร็จหลงเหลืออยู่', async () => {
    const { nav } = await openApp();

    expect(within(nav).queryByText('เร็ว ๆ นี้')).toBeNull();
    for (const label of ['การแจ้งเตือน', 'ตั้งค่าระบบ']) {
      expect(within(nav).queryByText(label)).toBeNull();
    }
    // จัดการผู้ใช้ทำเสร็จแล้ว ผู้ดูแลต้องเห็นเมนูนี้
    expect(within(nav).getByRole('link', { name: 'จัดการผู้ใช้' })).toBeDefined();
    // ช่องค้นหาและกระดิ่งเคยเป็นปุ่มที่กดไม่ได้ ต้องไม่กลับมาอีก
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /การแจ้งเตือน/ })).toBeNull();
  });

  it('รายการจองของฉัน แสดงเฉพาะของผู้ใช้คนนี้', async () => {
    const { user, nav } = await openApp();

    await goTo(user, nav, 'รายการจองของฉัน');
    // ข้อมูลตัวอย่าง: ผู้ดูแลมีการจองของตัวเอง 2 รายการ ที่เหลือเป็นของบัญชีอื่น
    await waitFor(() => expect(screen.getByText('ประชุมครูและบุคลากรประจำเดือน')).toBeDefined(), {
      timeout: 3000,
    });
    // ของคนอื่นต้องไม่โผล่
    expect(screen.queryByText('ประชุมแผนกวิชาการบัญชี')).toBeNull();
  });

  it('ปฏิทินแสดงเวลาแบบ 24 ชั่วโมง ไม่ใช่ AM/PM', async () => {
    const { user, nav } = await openApp();

    await goTo(user, nav, 'ปฏิทินการจอง');
    await waitFor(() => expect(screen.getByText('13:00')).toBeDefined(), { timeout: 3000 });
    expect(screen.queryByText(/\d+ (AM|PM)/)).toBeNull();
  });

  it('หน้าห้องประชุมแสดงห้องจากข้อมูลจริงที่เซิร์ฟเวอร์ส่งมา', async () => {
    const { user, nav } = await openApp();

    await goTo(user, nav, 'ห้องประชุม');
    await waitFor(() => expect(screen.getByText(/หอประชุมอดิเรกสาร/)).toBeDefined(), {
      timeout: 3000,
    });
  });
});

describe('สิทธิ์ผู้ใช้', () => {
  it('ออกจากระบบแล้วกลับไปหน้าเข้าสู่ระบบ ช่องรหัสผ่านซ่อนตัวอักษร', async () => {
    const { user } = await openApp();
    await signOutVia(user);
    expect(screen.getByLabelText('ชื่อผู้ใช้')).toBeDefined();
    expect((screen.getByLabelText('รหัสผ่าน') as HTMLInputElement).type).toBe('password');
  });

  it('session ที่ค้างจากรุ่นก่อน (ไม่เคยผ่านหน้า PIN) ใช้ไม่ได้ ต้องเข้าสู่ระบบใหม่', async () => {
    window.localStorage.setItem('mrb.session.token', 'demo-token:shoyu:1');
    renderApp();
    expect(await screen.findByLabelText('รหัสผ่าน', {}, { timeout: 5000 })).toBeDefined();
    expect(screen.queryByRole('navigation', { name: 'เมนูหลัก' })).toBeNull();
  });

  it('รหัสผ่านผิดเข้าไม่ได้ และบอกข้อความเดียวกับชื่อผู้ใช้ผิด', async () => {
    renderApp();
    await enterPassword('shoyu', 'WrongPass99');
    expect(await screen.findByText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', {}, { timeout: 3000 })).toBeDefined();
    await enterPassword('nobody', 'WrongPass99');
    await waitFor(() => expect(screen.getByText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')).toBeDefined(), { timeout: 3000 });
    expect(screen.queryByRole('navigation', { name: 'เมนูหลัก' })).toBeNull();
  });

  it('อีกทางเลือก: หน้า PIN ใส่ PIN อย่างเดียวครบ 6 หลักแล้วเข้าได้เลย ได้บัญชีของเจ้าของ PIN', async () => {
    renderApp();
    await enterPinOnly('999999');
    expect(await screen.findByText('PIN ไม่ถูกต้อง', {}, { timeout: 3000 })).toBeDefined();
    expect(screen.queryByLabelText('รหัสผ่าน')).toBeNull();
    fireEvent.change(screen.getByLabelText(/^PIN/), { target: { value: PINS.chatree } });
    await screen.findByRole('navigation', { name: 'เมนูหลัก' }, { timeout: 5000 });
    expect(screen.getByRole('button', { expanded: false, name: /นายชาตรี เริงชัยภูมิ/ })).toBeDefined();
  });

  it('จำวิธีเข้าสู่ระบบที่ใช้ล่าสุด เปิดมาครั้งหน้าอยู่หน้า PIN เลย', async () => {
    const { user } = await openApp();
    await signOutVia(user);
    fireEvent.click(screen.getByRole('tab', { name: 'PIN' }));
    cleanup();
    renderApp();
    expect(await screen.findByLabelText(/^PIN/, {}, { timeout: 5000 })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'PIN' }).getAttribute('aria-selected')).toBe('true');
  });

  it('พนักงานไม่เห็นเมนูของผู้ดูแลระบบ', async () => {
    const { nav } = await openApp('teacher');
    expect(within(nav).queryByRole('link', { name: 'จัดการผู้ใช้' })).toBeNull();
    expect(within(nav).queryByRole('link', { name: /อนุมัติ/ })).toBeNull();
    expect(within(nav).getByRole('link', { name: 'จองห้องประชุม' })).toBeDefined();
  });

  it('ผู้ดูแลเพิ่มผู้ใช้ที่จองได้ห้องเดียว แล้วคนนั้นเข้าระบบด้วย PIN ที่ได้และเห็นแค่ห้องนั้น', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จัดการผู้ใช้');
    // ผู้ลงนามครบทั้ง 3 ขั้นตั้งแต่ติดตั้ง
    expect((await screen.findAllByText('นายวัชรพงศ์ โสภา', { selector: 'p' }, { timeout: 3000 })).length).toBe(2);

    await user.click(screen.getByRole('button', { name: 'เพิ่มผู้ใช้' }));
    const dialog = await screen.findByRole('dialog', { name: 'เพิ่มผู้ใช้' });
    fireEvent.change(within(dialog).getByLabelText('ชื่อ-นามสกุล'), { target: { value: 'นางสาวทดสอบ ระบบ' } });
    fireEvent.change(within(dialog).getByLabelText(/ชื่อผู้ใช้/), { target: { value: 'tester' } });
    fireEvent.change(within(dialog).getByLabelText('รหัสผ่านแรกเข้า'), { target: { value: 'Tester2026' } });
    fireEvent.change(within(dialog).getByLabelText(/PIN แรกเข้า/), { target: { value: '582039' } });
    await user.click(within(dialog).getByRole('radio', { name: 'เลือกเฉพาะบางห้อง' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'ห้องประชุมสักทอง' }));
    await user.click(within(dialog).getByRole('button', { name: 'เพิ่มผู้ใช้' }));

    // รหัสผ่านและ PIN ที่ออกให้ค้างอยู่บนหน้าจนกดรับทราบ
    expect(await screen.findByText('ข้อมูลเข้าสู่ระบบของ นางสาวทดสอบ ระบบ', {}, { timeout: 3000 })).toBeDefined();
    expect(screen.getByText('582039')).toBeDefined();
    expect(screen.getByText('Tester2026')).toBeDefined();

    await signOutVia(user);
    const testerNav = await signInAs('tester', 'Tester2026');
    await goTo(user, testerNav, 'จองห้องประชุม');
    await waitFor(() => expect(screen.getAllByText('ห้องประชุมสักทอง').length).toBeGreaterThan(0), { timeout: 3000 });
    expect(screen.queryByText('หอประชุมอดิเรกสาร')).toBeNull();
  }, 30_000);

  it('ผู้ดูแลลบตัวเองไม่ได้ แต่รีเซ็ต PIN คนอื่นแล้ว PIN เดิมใช้ไม่ได้', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จัดการผู้ใช้');
    await screen.findByText('ครูทดลอง ใจดี', { selector: 'p' }, { timeout: 3000 });
    expect(screen.queryByRole('button', { name: 'ลบ shoyu' })).toBeNull();

    const row = screen.getByText('ครูทดลอง ใจดี', { selector: 'p' }).closest('li')!;
    await user.click(within(row).getByRole('button', { name: /รีเซ็ต PIN/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/PIN ใหม่/), { target: { value: '730264' } });
    await user.click(within(dialog).getByRole('button', { name: 'ตั้ง PIN ใหม่' }));
    await screen.findByText('ข้อมูลเข้าสู่ระบบของ ครูทดลอง ใจดี', {}, { timeout: 3000 });

    await signOutVia(user);
    await enterPinOnly(PINS.teacher!);
    expect(await screen.findByText('PIN ไม่ถูกต้อง', {}, { timeout: 3000 })).toBeDefined();
    fireEvent.change(screen.getByLabelText(/^PIN/), { target: { value: '730264' } });
    expect(await screen.findByRole('navigation', { name: 'เมนูหลัก' }, { timeout: 5000 })).toBeDefined();
  }, 30_000);

  it('รีเซ็ตรหัสผ่านแล้วรหัสผ่านเดิมเข้าไม่ได้ รหัสใหม่เข้าได้ (PIN เดิม)', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จัดการผู้ใช้');
    const row = (await screen.findByText('ครูทดลอง ใจดี', { selector: 'p' }, { timeout: 3000 })).closest('li')!;
    await user.click(within(row).getByRole('button', { name: /รีเซ็ตรหัสผ่าน/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('รหัสผ่านใหม่'), { target: { value: 'NewTeach88' } });
    await user.click(within(dialog).getByRole('button', { name: 'ตั้งรหัสผ่านใหม่' }));
    await screen.findByText('ข้อมูลเข้าสู่ระบบของ ครูทดลอง ใจดี', {}, { timeout: 3000 });

    await signOutVia(user);
    await enterPassword('teacher');
    expect(await screen.findByText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', {}, { timeout: 3000 })).toBeDefined();
    await signInAs('teacher', 'NewTeach88');
  }, 30_000);
});

describe('จองห้องจริงตั้งแต่ต้นจนจบ', () => {
  it('ฟอร์มมีช่องครบตามแบบคำขอ และมีห้องจริง 6 ห้องกับ "อื่น ๆ"', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จองห้องประชุม');

    expect(await screen.findByLabelText('ชื่อผู้จอง')).toBeDefined();
    for (const label of ['ตำแหน่ง', 'หน่วยงาน / สาขาวิชา', 'หมายเลขโทรศัพท์', 'เพื่อใช้ในการดำเนินงาน เรื่อง']) {
      expect((screen.getByLabelText(label) as HTMLInputElement).required).toBe(true);
    }
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(7));
    // เลือก "อื่น ๆ" แล้วต้องมีช่องระบุสถานที่
    await user.click(screen.getByText('อื่น ๆ (ระบุสถานที่)'));
    expect((await screen.findByLabelText('ระบุสถานที่') as HTMLInputElement).required).toBe(true);
  });

  it('จองด้วยชื่อผู้จอง แล้วรายการยังอยู่หลังรีเฟรชหน้า', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จองห้องประชุม');

    // รอรายชื่อห้องโหลดเสร็จก่อน — ระหว่างนั้นยังไม่มีห้องที่เลือก ปุ่มส่งจึงถูกปิดไว้ (ถูกต้องแล้ว)
    await waitFor(() =>
      expect(screen.getAllByRole('radio').some((radio) => (radio as HTMLInputElement).checked)).toBe(true),
    );
    await user.type(await screen.findByLabelText('ชื่อผู้จอง'), 'ทดสอบ ระบบจอง');
    await user.type(screen.getByLabelText('ตำแหน่ง'), 'ครู');
    await user.type(screen.getByLabelText('หมายเลขโทรศัพท์'), '081-234-5678');
    await user.type(screen.getByLabelText('เพื่อใช้ในการดำเนินงาน เรื่อง'), 'ประชุมทดสอบระบบ');
    // วันพุธในอนาคต ไม่ชนกับข้อมูลตั้งต้น และไม่ขึ้นกับว่าเทสรันวันไหน
    fireEvent.change(screen.getByLabelText('วันที่'), { target: { value: '2030-01-02' } });
    fireEvent.change(screen.getByLabelText('เริ่ม'), { target: { value: '13:00' } });
    fireEvent.change(screen.getByLabelText('สิ้นสุด'), { target: { value: '14:00' } });
    await user.click(screen.getByLabelText(/ดูแลรักษาทรัพย์สินของทางราชการ/));
    await user.click(screen.getByRole('button', { name: /ส่งคำขอจอง/ }));

    expect(await screen.findByText('ประชุมทดสอบระบบ', {}, { timeout: 3000 })).toBeDefined();

    // จำลองการรีเฟรช: ถอดแอปออกทั้งหมดแล้วเปิดใหม่ โดยไม่ล้าง localStorage
    cleanup();
    window.location.hash = '';
    const again = await openApp();
    await goTo(again.user, again.nav, 'รายการจองของฉัน');
    expect(await screen.findByText('ประชุมทดสอบระบบ', {}, { timeout: 3000 })).toBeDefined();
  }, 15_000);
});

describe('เมนูแถบบน: แสดงชื่อตลอด และมีป้ายแจ้งรายการรออนุมัติ', () => {
  it('เมนูอยู่แถบบน ไม่มีเมนูซ้าย และกดเมนูได้', async () => {
    await openApp();

    expect(screen.getByRole('navigation', { name: 'เมนูหลัก' }).closest('header')).not.toBeNull();
    expect(document.querySelector('aside')).toBeNull();
    // ลิงก์มีชื่อเต็มให้โปรแกรมอ่านหน้าจอ
    const nav = screen.getByRole('navigation', { name: 'เมนูหลัก' });
    expect(within(nav).getByRole('link', { name: 'ห้องประชุม' })).toBeDefined();
  });

  it('เมนูบนแสดงชื่อทุกเมนูตลอด ไม่มีปุ่มกาง/หุบ', async () => {
    await openApp();
    const nav = screen.getByRole('navigation', { name: 'เมนูหลัก' });
    expect(within(nav).getByText('ปฏิทิน')).toBeDefined();
    expect(within(nav).getByText('ตั้งค่า')).toBeDefined();
    expect(screen.queryByRole('button', { name: /ขยายเมนู|ย่อเมนู/ })).toBeNull();
  });

  it('อนุมัติ 3 ขั้นคนละบัญชี: ตรวจห้องแล้วเด้งไปผู้รับรอง แล้วไปผู้อนุมัติ', async () => {
    const { user, nav: adminNav } = await openApp();
    let nav = adminNav;
    const switchTo = async (username: string) => {
      await signOutVia(user);
      nav = await signInAs(username);
    };

    // ผู้ดูแลเห็นคำขอที่ค้างทุกขั้น (ตั้งต้น 2 รายการ: รอขั้น 1 และรอขั้น 2) แต่ลงนามแทนไม่ได้
    await within(nav).findByRole('link', { name: /^อนุมัติการใช้ห้อง.*มี 2 รายการ/ }, { timeout: 3000 });

    // ขั้น 1: เจ้าหน้าที่ตรวจห้องเห็นเฉพาะของตัวเอง 1 รายการ
    await switchTo('watcharapong');
    await user.click(await within(nav).findByRole('link', { name: /^อนุมัติการใช้ห้อง.*มี 1 รายการ/ }, { timeout: 3000 }));
    // PIN ผิด: ยังไม่ลงนาม หน้าต่างยังเปิดอยู่ให้ลองใหม่
    await signWithPin(user, await screen.findByRole('button', { name: 'ห้องพร้อม ส่งต่อผู้รับรอง' }, { timeout: 3000 }), '999999');
    expect(await screen.findByText('PIN ไม่ถูกต้อง', {}, { timeout: 3000 })).toBeDefined();
    const pinDialog = screen.getByRole('dialog', { name: 'ยืนยันการลงนามด้วย PIN' });
    fireEvent.change(within(pinDialog).getByLabelText(/^PIN/), { target: { value: PINS.watcharapong } });
    await user.click(within(pinDialog).getByRole('button', { name: 'ลงนาม' }));
    await waitFor(() => expect(within(nav).getByRole('link', { name: 'อนุมัติการใช้ห้อง' })).toBeDefined(), { timeout: 3000 });

    // ขั้น 2: ผู้รับรองตอนนี้มี 2 รายการ (รายการที่เพิ่งผ่านขั้น 1 + รายการที่รออยู่แล้ว)
    await switchTo('ekkarat');
    await within(nav).findByRole('link', { name: /^อนุมัติการใช้ห้อง.*มี 2 รายการ/ }, { timeout: 3000 });
    const endorse = await screen.findAllByRole('button', { name: 'รับรอง ส่งต่อผู้อนุมัติ' }, { timeout: 3000 });
    await signWithPin(user, endorse[0]!, PINS.ekkarat!);
    await within(nav).findByRole('link', { name: /^อนุมัติการใช้ห้อง.*มี 1 รายการ/ }, { timeout: 3000 });

    // ขั้น 3: ผู้อนุมัติกดแล้วรายการนั้นยืนยันแล้ว
    await switchTo('chatree');
    await signWithPin(user, await screen.findByRole('button', { name: 'อนุมัติการใช้ห้อง' }, { timeout: 3000 }), PINS.chatree!);
    await waitFor(() => expect(within(nav).getByRole('link', { name: 'อนุมัติการใช้ห้อง' })).toBeDefined(), { timeout: 3000 });
  }, 30_000);
});

describe('มือถือ: เมนูด้านล่าง', () => {
  it('มี 5 ช่อง และปุ่มจองห้องอยู่ตรงกลาง', async () => {
    await openApp();

    const bar = screen.getByRole('navigation', { name: 'เมนูด้านล่าง' });
    const slots = within(bar).getAllByRole('listitem');
    expect(slots).toHaveLength(5);
    expect(within(slots[2]!).getByRole('link').textContent).toContain('จองห้อง');
    expect(within(bar).getByRole('button', { name: /เพิ่มเติม/ })).toBeDefined();
  });

  it('"เพิ่มเติม" เปิดแผ่นเมนูที่เหลือพร้อมป้ายรออนุมัติ และกด Esc แล้วปิด', async () => {
    const { user } = await openApp();
    const bar = screen.getByRole('navigation', { name: 'เมนูด้านล่าง' });

    // ป้ายรออนุมัติต้องโผล่ที่ปุ่มเพิ่มเติมด้วย เพราะเมนูรออนุมัติอยู่ข้างใน
    const more = await within(bar).findByRole('button', { name: /เพิ่มเติม.*มี 2 รายการรออนุมัติ/ }, { timeout: 3000 });
    await user.click(more);

    const sheet = screen.getByRole('dialog', { name: 'เมนูเพิ่มเติม' });
    expect(within(sheet).getByRole('link', { name: 'ห้องประชุม' })).toBeDefined();
    expect(within(sheet).getByRole('link', { name: /^อนุมัติการใช้ห้อง.*มี 2 รายการ/ })).toBeDefined();
    expect(within(sheet).getByRole('link', { name: 'พิมพ์แบบฟอร์ม A4' })).toBeDefined();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'เมนูเพิ่มเติม' })).toBeNull();
  });
});

describe('ปฏิทินมุมมองเดือน', () => {
  it('วันที่อยู่ใต้คอลัมน์วันในสัปดาห์ที่ถูกต้อง', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'ปฏิทินการจอง');
    await user.click(screen.getByRole('button', { name: 'เดือน' }));

    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(42);
    // วันที่เลือกตอนเปิดหน้าคือวันนี้ ต้องอยู่คอลัมน์เดียวกับวันในสัปดาห์ของวันนี้ (อา.=0)
    const todayIndex = cells.findIndex((cell) => cell.getAttribute('aria-selected') === 'true');
    expect(todayIndex % 7).toBe(dayOfWeekOfDateKey(toDateKey(new Date())));
  });
});

describe('ช่องเลือกเวลาในฟอร์มจอง', () => {
  it('เป็นรายการเวลาทุก 15 นาที และเวลาสิ้นสุดเลื่อนตามเมื่อเวลาเริ่มเลยไป', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จองห้องประชุม');

    const start = (await screen.findByLabelText('เริ่ม')) as HTMLSelectElement;
    const end = screen.getByLabelText('สิ้นสุด') as HTMLSelectElement;
    expect(start.tagName).toBe('SELECT');

    const startValues = [...start.options].map((option) => option.value);
    expect(startValues[0]).toBe('08:00');
    expect(startValues).toContain('09:15');
    expect(startValues.every((value) => Number(value.slice(3)) % 15 === 0)).toBe(true);

    // เวลาสิ้นสุดทุกตัวเลือกต้องหลังเวลาเริ่ม
    expect([...end.options].every((option) => option.value > start.value)).toBe(true);

    // เลือกเวลาเริ่มเลยเวลาสิ้นสุดเดิม (10:00) -> สิ้นสุดต้องเลื่อนเป็นอีกหนึ่งชั่วโมง
    // ตั้งเวลาเองก่อน เพราะฟอร์มเปิดมาที่เวลาว่างถัดไปซึ่งขึ้นกับเวลาที่รันเทส
    fireEvent.change(start, { target: { value: '08:00' } });
    fireEvent.change(end, { target: { value: '10:00' } });
    fireEvent.change(start, { target: { value: '15:00' } });
    expect(end.value).toBe('16:00');
  });
});

describe('ห้องไม่ว่าง: บอกตั้งแต่ตอนกรอกฟอร์ม', () => {
  it('เลือกช่วงที่ชน -> เตือนพร้อมเวลาว่าง ปุ่มส่งกดไม่ได้ กดเวลาที่แนะนำแล้วส่งได้', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จองห้องประชุม');

    // ข้อมูลตั้งต้น: ห้องประชุมใหญ่ วันนี้ 09:00-10:30 มีคนจองแล้ว
    // ฟอร์มเปิดมาที่เวลาว่างเอง จึงต้องตั้งวันนี้ 09:00 ให้ชนก่อน (เหมือนเวลาที่เลือกไว้แล้วค่อยเปลี่ยนห้อง/วัน)
    await waitFor(() =>
      expect(screen.getAllByRole('radio').some((radio) => (radio as HTMLInputElement).checked)).toBe(true),
    );
    fireEvent.change(screen.getByLabelText('วันที่'), { target: { value: toDateKey(new Date()) } });
    fireEvent.change(screen.getByLabelText('เริ่ม'), { target: { value: '09:00' } });
    const warning = await screen.findByRole('alert', {}, { timeout: 3000 });
    expect(warning.textContent).toContain('ห้องนี้ไม่ว่างเวลา 09:00–10:30 น.');
    await user.click(screen.getByLabelText(/ดูแลรักษาทรัพย์สินของทางราชการ/));
    expect((screen.getByRole('button', { name: /ส่งคำขอจอง/ }) as HTMLButtonElement).disabled).toBe(true);

    // เวลาที่ชนเลือกไม่ได้ในรายการ
    const start = screen.getByLabelText('เริ่ม') as HTMLSelectElement;
    expect([...start.options].find((option) => option.value === '09:00')?.disabled).toBe(true);

    // กดเวลาว่างที่ระบบเสนอ
    const suggestion = within(warning).getAllByRole('button')[0]!;
    await user.click(suggestion);
    await waitFor(() => expect(screen.queryByText(/ห้องนี้ไม่ว่างเวลา/)).toBeNull());
    expect((screen.getByRole('button', { name: /ส่งคำขอจอง/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('การตั้งค่าเชื่อมต่อระบบ', () => {
  it('ผู้ดูแลเปิดหน้าต่าง ใส่ลิงก์ผิดถูกเตือน ใส่ถูกแล้วบันทึก เปิดใหม่ค่ายังอยู่', async () => {
    const { user } = await openApp();
    await user.click(await screen.findByRole('button', { name: 'การตั้งค่าเชื่อมต่อระบบ' }));
    const dialog = screen.getByRole('dialog', { name: /การตั้งค่าเชื่อมต่อระบบ/ });

    const endpoint = within(dialog).getByLabelText(/Web App URL/);
    await user.type(endpoint, 'https://example.com/not-apps-script');
    await user.tab();
    expect(within(dialog).getByText(/ลงท้ายด้วย \/exec/)).toBeDefined();

    await user.clear(endpoint);
    await user.type(endpoint, 'https://script.google.com/macros/s/AKfycbx123456789abc/exec');
    await user.type(within(dialog).getByLabelText(/Google Sheets/), 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit');
    expect(within(dialog).getByText('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789')).toBeDefined();
    await user.click(within(dialog).getByRole('button', { name: 'บันทึก' }));
    expect(screen.queryByRole('dialog', { name: /การตั้งค่าเชื่อมต่อระบบ/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'การตั้งค่าเชื่อมต่อระบบ' }));
    const again = screen.getByRole('dialog', { name: /การตั้งค่าเชื่อมต่อระบบ/ });
    expect((within(again).getByLabelText(/Web App URL/) as HTMLInputElement).value).toBe('https://script.google.com/macros/s/AKfycbx123456789abc/exec');
  });
});

describe('ส่วนที่เพิ่มตามเช็กลิสต์', () => {
  it('หน้าภาพรวมมีการ์ดผู้เข้าใช้รวม กราฟแผนกวิชา และประกาศ ผู้ดูแลเพิ่มประกาศได้', async () => {
    const { user } = await openApp();
    expect(await screen.findByText('ผู้เข้าใช้รวม')).toBeDefined();
    expect(await screen.findByText('แผนกวิชาที่ขอใช้บริการมากที่สุด')).toBeDefined();
    expect(await screen.findByText('ขอความร่วมมือคืนห้องตรงเวลา', {}, { timeout: 3000 })).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'เพิ่มประกาศ' }));
    await user.type(screen.getByLabelText('หัวข้อประกาศ'), 'ห้องอบรมปิดปรับปรุงแอร์');
    await user.click(screen.getByText('ด่วน / ห้องปิดใช้งาน'));
    await user.click(screen.getByRole('button', { name: 'เผยแพร่ประกาศ' }));
    expect(await screen.findByText('ห้องอบรมปิดปรับปรุงแอร์', {}, { timeout: 3000 })).toBeDefined();
  });

  it('ปฏิทินกรองตามห้องและค้นหาแผนกได้ จำนวนที่จะดาวน์โหลดเปลี่ยนตาม', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'ปฏิทินการจอง');
    const exportButton = await screen.findByRole('button', { name: /ดาวน์โหลด Excel/ });
    await waitFor(() => expect(exportButton.textContent).not.toContain('(0 รายการ)'));
    const total = Number(/\((\d+) รายการ\)/.exec(exportButton.textContent ?? '')?.[1]);

    await user.click(screen.getByRole('button', { name: 'ห้องประชุมสักทอง' }));
    const byRoom = Number(/\((\d+) รายการ\)/.exec(exportButton.textContent ?? '')?.[1]);
    expect(byRoom).toBeGreaterThan(0);
    expect(byRoom).toBeLessThan(total);

    await user.click(screen.getByRole('button', { name: 'ทุกห้อง' }));
    await user.type(screen.getByLabelText('ค้นหาตามแผนกวิชาหรือชื่อผู้จอง'), 'ไม่มีแผนกนี้แน่นอน');
    expect(exportButton.textContent).toContain('(0 รายการ)');
    expect((exportButton as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('แบบคำขอใช้ห้อง (กรอกผ่านเว็บ พิมพ์เป็นแบบฟอร์มของวิทยาลัย)', () => {
  it('หน้าแบบฟอร์มเติมข้อมูลจากคำขอ ติ๊กห้องและอุปกรณ์ และใส่ชื่อผู้ลงนามที่ลงนามแล้ว', async () => {
    window.location.hash = '#/reports?booking=demo-bk-1';
    renderApp();
    // เปิดลิงก์ตรงก่อนเข้าระบบ: เข้าระบบแล้วต้องกลับมาหน้าเดิม ไม่เด้งไปหน้าแรก
    await signInAs('shoyu');
    const sheet = await screen.findByRole('article', { name: 'แบบคำขออนุญาตใช้ห้องประชุม' }, { timeout: 5000 });
    const text = sheet.textContent ?? '';
    for (const expected of ['อ.สมชาย ใจดี', 'แผนกวิชาเทคโนโลยีสารสนเทศ', '081-234-5678', 'ประชุมครูและบุคลากรประจำเดือน', '09.00', '10.30', 'นายเอกราช เขียวทอง', 'รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน']) {
      expect(text).toContain(expected);
    }
    // ใช้ชื่อแทนลายเซ็น พร้อมวันที่และเวลาที่กดอนุมัติ
    expect(text).toMatch(/วันที่.*เวลา \d{2}\.\d{2} น\./);
    // ห้องที่เลือก (หอประชุมอดิเรกสาร) ติ๊ก 1 ช่อง + อุปกรณ์ 3 รายการ + พร้อมใช้งาน = 5 ช่อง
    expect(within(sheet).getAllByRole('img', { name: 'เลือก' })).toHaveLength(5);
  });

  it('ยังไม่มีใครกดอนุมัติ ห้ามมีชื่อผู้อนุมัติในแบบฟอร์ม', async () => {
    window.location.hash = '#/reports?booking=demo-bk-5';
    renderApp();
    await signInAs('shoyu');
    const sheet = await screen.findByRole('article', { name: 'แบบคำขออนุญาตใช้ห้องประชุม' }, { timeout: 5000 });
    const text = sheet.textContent ?? '';
    expect(text).toContain('ประชุมเตรียมงานวันวิชาการ');
    for (const approver of ['นายวัชรพงศ์ โสภา', 'นายเอกราช เขียวทอง', 'นายชาตรี เริงชัยภูมิ']) {
      expect(text).not.toContain(approver);
    }
  });

  it('หน้าจองดูตัวอย่างแบบฟอร์มที่กำลังกรอกได้ก่อนส่ง', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จองห้องประชุม');
    await user.selectOptions(await screen.findByLabelText('คำนำหน้าชื่อ'), 'นางสาว');
    await user.type(screen.getByLabelText('ชื่อผู้จอง'), 'ใจดี มีสุข');
    await user.click(screen.getByRole('button', { name: /ดูตัวอย่างแบบฟอร์ม/ }));
    const dialog = screen.getByRole('dialog', { name: 'ตัวอย่างแบบคำขอ' });
    expect(within(dialog).getByRole('article').textContent).toContain('นางสาวใจดี มีสุข');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'ตัวอย่างแบบคำขอ' })).toBeNull();
  });
});

describe('ปฏิทินแสดงเฉพาะรายการที่อนุมัติครบ 3 ขั้น', () => {
  it('คำขอที่ยังรออนุมัติไม่ขึ้นปฏิทิน และกดรายการเพื่อดูรายละเอียดได้', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'ปฏิทินการจอง');
    // ข้อมูลตั้งต้น: "นางสุดารัตน์ บุญมา" (พรุ่งนี้) ยังรอขั้นที่ 1 อยู่
    await waitFor(() => expect(screen.getAllByRole('button', { name: /ประชุม|อ\.สมชาย/ }).length).toBeGreaterThan(0), { timeout: 3000 });
    expect(screen.queryByTitle(/นางสุดารัตน์ บุญมา/)).toBeNull();

    await user.click(screen.getAllByTitle(/อ\.สมชาย ใจดี/)[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'ประชุมครูและบุคลากรประจำเดือน' });
    expect(within(dialog).getByText('หอประชุมอดิเรกสาร')).toBeDefined();
    expect(within(dialog).getByRole('link', { name: /ดูแบบฟอร์มคำขอ/ })).toBeDefined();
  });
});


describe('ตั้งค่าข้อมูล: ผู้ดูแลแก้ห้องและรายการตั้งต้นเองได้', () => {
  it('เพิ่มห้องใหม่แล้วห้องนั้นขึ้นในหน้าจอง ห้องที่มีการจองแล้วลบไม่ได้', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'ตั้งค่าข้อมูล');
    await user.click(await screen.findByRole('button', { name: 'เพิ่มห้อง' }));
    const dialog = await screen.findByRole('dialog', { name: 'เพิ่มห้องประชุม' });
    await user.type(within(dialog).getByLabelText('รหัสห้อง'), 'r09');
    await user.type(within(dialog).getByLabelText('ชื่อห้อง'), 'ห้องประชุมอาคาร 9');
    await user.click(within(dialog).getByLabelText('ไวท์บอร์ด'));
    await user.click(within(dialog).getByRole('button', { name: 'บันทึก' }));
    expect(await screen.findByText('ห้องประชุมอาคาร 9', {}, { timeout: 3000 })).toBeDefined();

    // หอประชุมมีการจองตัวอย่างอยู่ — ระบบต้องไม่ให้ลบ เพื่อไม่ให้ประวัติหาย
    await user.click(screen.getByRole('button', { name: 'ลบ หอประชุมอดิเรกสาร' }));
    const confirm = await screen.findByRole('dialog', { name: /ลบ หอประชุมอดิเรกสาร/ });
    await user.click(within(confirm).getByRole('button', { name: 'ลบห้อง' }));
    expect(await within(confirm).findByText(/มีประวัติการจองแล้ว ลบไม่ได้/, {}, { timeout: 3000 })).toBeDefined();
    await user.click(within(confirm).getByRole('button', { name: 'ยกเลิก' }));

    await goTo(user, nav, 'จองห้องประชุม');
    expect(await screen.findByText('ห้องประชุมอาคาร 9', {}, { timeout: 3000 })).toBeDefined();
  });

  it('เพิ่มอุปกรณ์ที่ขอใช้ได้ ปิดรายการเดิม แล้วแบบฟอร์มจองเปลี่ยนตามทันที', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'ตั้งค่าข้อมูล');
    await user.click(screen.getByRole('tab', { name: 'อุปกรณ์ที่ขอใช้ได้' }));
    await user.type(screen.getByLabelText('เพิ่มอุปกรณ์ที่ขอใช้ได้'), 'จอ LED');
    await user.click(screen.getByRole('button', { name: 'เพิ่ม' }));
    expect(await screen.findByText('จอ LED', {}, { timeout: 3000 })).toBeDefined();
    const internet = screen.getByText('อินเทอร์เน็ต').closest('li')!;
    await user.click(within(internet).getByRole('switch'));
    await waitFor(() => expect(within(internet).getByText('ปิดไว้')).toBeDefined(), { timeout: 3000 });

    await goTo(user, nav, 'จองห้องประชุม');
    const facilities = await screen.findByRole('group', { name: 'ครุภัณฑ์/อุปกรณ์/สิ่งอำนวยความสะดวกที่ขอใช้' });
    expect(within(facilities).getByText('จอ LED')).toBeDefined();
    expect(within(facilities).queryByText('อินเทอร์เน็ต')).toBeNull();
  });

  it('แบบฟอร์มจองเติมตำแหน่งกับแผนกจากบัญชีให้เอง และมีช่องประเภทการประชุม', async () => {
    const { user, nav } = await openApp('teacher');
    await goTo(user, nav, 'จองห้องประชุม');
    expect((await screen.findByLabelText('ตำแหน่ง') as HTMLInputElement).value).toBe('ครู');
    expect((screen.getByLabelText('หน่วยงาน / สาขาวิชา') as HTMLInputElement).value).not.toBe('');
    expect(screen.getByLabelText(/ประเภทการประชุม/)).toBeDefined();
  });

  it('พนักงานเข้าหน้าตั้งค่าข้อมูลไม่ได้', async () => {
    const { nav } = await openApp('teacher');
    expect(within(nav).queryByRole('link', { name: 'ตั้งค่าข้อมูล' })).toBeNull();
    window.location.hash = '#/manage';
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'ตั้งค่าข้อมูล' })).toBeNull());
  });
});

describe('รีวิวห้องหลังใช้งาน', () => {
  it('ผู้จองให้คะแนนการประชุมที่เสร็จแล้ว ต้องให้ดาวครบทุกด้าน และรีวิวซ้ำไม่ได้', async () => {
    const { user, nav } = await openApp('teacher');
    await goTo(user, nav, 'รายการจองของฉัน');
    // จำนวนที่รอขึ้นกับเวลาที่รันเทส (การประชุมตัวอย่างของวันนี้อาจจบไปแล้ว) จึงเทียบก่อน/หลัง
    const awaiting = () => Number(/มีการประชุม (\d+) รายการ/.exec(screen.queryByText(/รอให้คะแนนห้อง/)?.textContent ?? '')?.[1] ?? 0);
    await waitFor(() => expect(awaiting()).toBeGreaterThan(0), { timeout: 3000 });
    const before = awaiting();
    // การประชุมที่รีวิวไปแล้วแสดงว่าให้คะแนนแล้ว ไม่มีปุ่มซ้ำ
    const reviewedCard = screen.getByText('ประชุมวางแผนภาคเรียนที่ 2').closest('div.flex.flex-col') as HTMLElement;
    expect(within(reviewedCard).getByText('ให้คะแนนแล้ว')).toBeDefined();
    expect(within(reviewedCard).queryByRole('button', { name: 'ให้คะแนนห้อง' })).toBeNull();
    // การประชุมที่จบแล้วไม่มีปุ่มยกเลิก
    expect(within(reviewedCard).queryByRole('button', { name: 'ยกเลิก' })).toBeNull();

    const card = screen.getByText('อบรมการเขียนแผนการสอน').closest('div.flex.flex-col') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'ให้คะแนนห้อง' }));
    const dialog = await screen.findByRole('dialog', { name: /ให้คะแนน/ });
    await user.click(within(within(dialog).getByRole('group', { name: 'ความพึงพอใจโดยรวม' })).getByRole('radio', { name: 'ดีมาก 4 จาก 5' }));
    await user.click(within(dialog).getByRole('button', { name: 'ส่งคะแนน' }));
    expect(within(dialog).getAllByText('กรุณาให้คะแนนด้านนี้')).toHaveLength(3);

    for (const legend of ['ความสะอาด', 'อุปกรณ์', 'ความสะดวกในการใช้งาน']) {
      const group = within(dialog).getByRole('group', { name: legend });
      await user.click(within(group).getByRole('radio', { name: 'ดี 3 จาก 5' }));
    }
    await user.type(within(dialog).getByLabelText(/ความคิดเห็น/), 'ไมค์ตัวที่ 2 ถ่านหมด');
    await user.click(within(dialog).getByRole('button', { name: 'ส่งคะแนน' }));
    expect(await screen.findByText(/ขอบคุณที่ให้คะแนน/, {}, { timeout: 3000 })).toBeDefined();
    expect(within(card).queryByRole('button', { name: 'ให้คะแนนห้อง' })).toBeNull();
    expect(awaiting()).toBe(before - 1);
  });

  it('หน้าห้องประชุมแสดงคะแนนเฉลี่ยให้ทุกคน แต่ไม่แสดงความคิดเห็น', async () => {
    const { user, nav } = await openApp('teacher');
    await goTo(user, nav, 'ห้องประชุม');
    expect(await screen.findAllByText('(1 รีวิว)', {}, { timeout: 3000 })).toHaveLength(2);
    expect(screen.getAllByText('ยังไม่มีรีวิว').length).toBeGreaterThan(0);
    expect(screen.queryByText(/สาย HDMI หลวม/)).toBeNull();
  });

  it('ผู้ดูแลเห็นความคิดเห็นในหน้ารีวิว พนักงานเข้าไม่ได้', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'รีวิวห้องประชุม');
    expect(await screen.findByText(/สาย HDMI หลวม/, {}, { timeout: 3000 })).toBeDefined();
    await user.click(screen.getByLabelText('เฉพาะที่มีความคิดเห็น'));
    expect(screen.getByText('รีวิวทั้งหมด').parentElement!.textContent).toContain('(1 รายการ)');

    cleanup(); window.localStorage.clear(); window.location.hash = '';
    const teacher = await openApp('teacher');
    expect(within(teacher.nav).queryByRole('link', { name: 'รีวิวห้องประชุม' })).toBeNull();
    window.location.hash = '#/reviews';
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'รีวิวห้องประชุม' })).toBeNull());
  });
});

describe('รายงานสรุปและสถานะห้องตอนนี้', () => {
  it('ผู้ดูแลดูรายงานตามช่วงที่กำหนด แล้วส่งออกเป็นไฟล์ Excel ได้', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'รายงานสรุป');
    await user.click(screen.getByRole('radio', { name: 'กำหนดเอง' }));
    const today = toDateKey(new Date());
    fireEvent.change(screen.getByLabelText('ตั้งแต่วันที่'), { target: { value: addDaysToDateKey(today, -7) } });
    fireEvent.change(screen.getByLabelText('ถึงวันที่'), { target: { value: addDaysToDateKey(today, 7) } });
    // ข้อมูลตั้งต้น: อนุมัติแล้ว 4 รายการ + ประชุมไปแล้ว 3 รายการ (รออนุมัติ/ยกเลิกไม่นับ)
    expect(await screen.findByText('7 ครั้ง', {}, { timeout: 3000 })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'แยกตามห้องประชุม' })).toBeDefined();

    fireEvent.change(screen.getByLabelText('ห้องประชุม', { selector: 'select' }), { target: { value: 'demo-room-1' } });
    expect(await screen.findByText('3 ครั้ง')).toBeDefined();

    const created: Blob[] = [];
    const createUrl = vi.fn((blob: Blob) => { created.push(blob); return 'blob:report'; });
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await user.click(screen.getByRole('button', { name: 'ส่งออก Excel' }));
    expect(created[0]?.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('พนักงานไม่เห็นเมนูรายงานสรุปและเข้าตรงไม่ได้', async () => {
    const { nav } = await openApp('teacher');
    expect(within(nav).queryByRole('link', { name: 'รายงานสรุป' })).toBeNull();
    window.location.hash = '#/summary';
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'รายงานสรุปการใช้ห้อง' })).toBeNull());
  });

  it('หน้าภาพรวมบอกสถานะห้องตอนนี้ทุกห้อง รวมถึงพนักงาน', async () => {
    await openApp('teacher');
    const panel = (await screen.findByRole('heading', { name: 'สถานะห้องตอนนี้' }, { timeout: 3000 })).closest('section, div.rounded-card, [class*="card"]') ?? document.body;
    await waitFor(() => expect(within(panel as HTMLElement).getByText(/กำลังใช้ \d+ ห้อง · ว่าง \d+ ห้อง/)).toBeDefined(), { timeout: 3000 });
    expect(within(panel as HTMLElement).getByText('หอประชุมอดิเรกสาร')).toBeDefined();
    // ห้อง "อื่น ๆ (ระบุสถานที่)" ไม่ใช่ห้องจริง ไม่ต้องบอกสถานะ
    expect(within(panel as HTMLElement).queryByText('อื่น ๆ (ระบุสถานที่)')).toBeNull();
  });
});
