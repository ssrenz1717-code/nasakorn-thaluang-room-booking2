import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { AppProvider } from '../app/providers/AppProvider';
import { ToastProvider } from '../components/ui/Toast';
import { dayOfWeekOfDateKey, toDateKey } from '@shared/time/bangkok';

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

/** รอจนเข้าระบบและเห็นเมนูหลักแล้ว (โหมดสาธิตเข้าระบบให้อัตโนมัติ) */
async function openApp() {
  const user = userEvent.setup();
  renderApp();
  const nav = await screen.findByRole('navigation', { name: 'เมนูหลัก' }, { timeout: 5000 });
  return { user, nav };
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
  it('ไม่จอขาว และเข้าระบบให้เลยโดยไม่ต้องกดอะไร', async () => {
    await openApp();

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

    // ข้อมูลตั้งต้นมีการจองทั้งหมด 6 รายการ — ตัวเลขที่มองเห็น (aria-hidden) ต้องหยุดที่ 6
    const label = await screen.findByText('รวมทั้งหมด');
    const card = label.parentElement!;
    await waitFor(
      () => expect(card.querySelector('strong [aria-hidden="true"]')?.textContent).toBe('6'),
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
    for (const label of ['การแจ้งเตือน', 'จัดการผู้ใช้', 'ตั้งค่าระบบ']) {
      expect(within(nav).queryByText(label)).toBeNull();
    }
    // ช่องค้นหาและกระดิ่งเคยเป็นปุ่มที่กดไม่ได้ ต้องไม่กลับมาอีก
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /การแจ้งเตือน/ })).toBeNull();
  });

  it('รายการจองของฉัน แสดงเฉพาะของผู้ใช้คนนี้', async () => {
    const { user, nav } = await openApp();

    await goTo(user, nav, 'รายการจองของฉัน');
    // ข้อมูลตัวอย่าง: ผู้ดูแลมีการจองของตัวเอง 1 รายการ ที่เหลือเป็นของพนักงานและฝ่ายบุคคล
    await waitFor(() => expect(screen.getByText('อ.สมชาย ใจดี')).toBeDefined(), {
      timeout: 3000,
    });
    // ของคนอื่นต้องไม่โผล่ และต้องแสดงชื่อผู้จอง ไม่ใช่หัวข้อการประชุม
    expect(screen.queryByText('นางสาวกนกวรรณ ศรีสุข')).toBeNull();
    expect(screen.queryByText('ประชุมผู้บริหารประจำสัปดาห์')).toBeNull();
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
    await waitFor(() => expect(screen.getByText(/ห้องประชุมใหญ่/)).toBeDefined(), {
      timeout: 3000,
    });
  });
});

describe('สิทธิ์ผู้ใช้', () => {
  it('ออกจากระบบแล้วกลับไปหน้าเข้าสู่ระบบ', async () => {
    const { user } = await openApp();

    await user.click(screen.getByRole('button', { expanded: false, name: /ผู้ดูแลระบบ/ }));
    await user.click(screen.getByRole('menuitem', { name: /ออกจากระบบ/ }));

    expect(await screen.findByRole('button', { name: /เข้าสู่ระบบในฐานะเจ้าหน้าที่/ })).toBeDefined();
    // ชื่อระบบเคยถูกพิมพ์ซ้ำสองบรรทัดในหน้านี้
    expect(screen.getAllByText('ระบบจองห้องประชุม')).toHaveLength(1);
  });

  it('พนักงานไม่เห็นเมนูของผู้ดูแลระบบ', async () => {
    const { user } = await openApp();

    await user.click(screen.getByRole('button', { expanded: false, name: /ผู้ดูแลระบบ/ }));
    await user.click(screen.getByRole('menuitem', { name: /ออกจากระบบ/ }));
    await user.click(await screen.findByRole('button', { name: /เข้าสู่ระบบในฐานะเจ้าหน้าที่/ }));

    const nav = await screen.findByRole('navigation', { name: 'เมนูหลัก' }, { timeout: 5000 });
    expect(within(nav).queryByText('จัดการผู้ใช้')).toBeNull();
    expect(within(nav).queryByText('ตั้งค่าระบบ')).toBeNull();
    expect(within(nav).queryByText('รออนุมัติ')).toBeNull();
    expect(within(nav).getByText('จองห้องประชุม')).toBeDefined();
  });
});

describe('จองห้องจริงตั้งแต่ต้นจนจบ', () => {
  it('ฟอร์มไม่มีช่องหัวข้อ ตำแหน่ง และเบอร์โทรแล้ว', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จองห้องประชุม');

    expect(await screen.findByLabelText('ชื่อผู้จอง')).toBeDefined();
    expect(screen.queryByLabelText(/เพื่อใช้ดำเนินงาน/)).toBeNull();
    expect(screen.queryByLabelText('ตำแหน่ง')).toBeNull();
    expect(screen.queryByLabelText('หมายเลขโทรศัพท์')).toBeNull();
  });

  it('จองด้วยชื่อผู้จอง แล้วรายการยังอยู่หลังรีเฟรชหน้า', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จองห้องประชุม');

    // รอรายชื่อห้องโหลดเสร็จก่อน — ระหว่างนั้นยังไม่มีห้องที่เลือก ปุ่มส่งจึงถูกปิดไว้ (ถูกต้องแล้ว)
    await waitFor(() =>
      expect((screen.getByLabelText('ห้องประชุม') as HTMLSelectElement).value).not.toBe(''),
    );
    await user.type(await screen.findByLabelText('ชื่อผู้จอง'), 'นายทดสอบ ระบบจอง');
    // วันพุธในอนาคต ไม่ชนกับข้อมูลตั้งต้น และไม่ขึ้นกับว่าเทสรันวันไหน
    fireEvent.change(screen.getByLabelText('วันที่'), { target: { value: '2030-01-02' } });
    fireEvent.change(screen.getByLabelText('เริ่ม'), { target: { value: '13:00' } });
    fireEvent.change(screen.getByLabelText('สิ้นสุด'), { target: { value: '14:00' } });
    await user.click(screen.getByLabelText(/ข้าพเจ้าจะดูแลรักษาทรัพย์สิน/));
    await user.click(screen.getByRole('button', { name: /ส่งคำขอจอง/ }));

    expect(await screen.findByText('นายทดสอบ ระบบจอง', {}, { timeout: 3000 })).toBeDefined();

    // จำลองการรีเฟรช: ถอดแอปออกทั้งหมดแล้วเปิดใหม่ โดยไม่ล้าง localStorage
    cleanup();
    window.location.hash = '';
    const again = await openApp();
    await goTo(again.user, again.nav, 'รายการจองของฉัน');
    expect(await screen.findByText('นายทดสอบ ระบบจอง', {}, { timeout: 3000 })).toBeDefined();
  }, 15_000);
});

describe('เมนูซ้าย: ย่อได้ และมีป้ายแจ้งรายการรออนุมัติ', () => {
  const sidebarPanel = () => document.querySelector('aside [data-expanded]') as HTMLElement;

  it('เปิดเว็บมาเมนูหุบไว้ก่อน แต่ยังกดเมนูได้', async () => {
    await openApp();

    expect(sidebarPanel().dataset.expanded).toBe('false');
    // ชื่อเมนูซ่อนจากสายตา แต่ลิงก์ยังมีชื่อให้โปรแกรมอ่านหน้าจอและกดได้
    const nav = screen.getByRole('navigation', { name: 'เมนูหลัก' });
    expect(within(nav).getByRole('link', { name: 'ห้องประชุม' })).toBeDefined();
  });

  it('เอาเมาส์วางแล้วเมนูเด้งออก เอาออกแล้วหุบเอง', async () => {
    await openApp();

    fireEvent.mouseEnter(sidebarPanel());
    await waitFor(() => expect(sidebarPanel().dataset.expanded).toBe('true'));
    fireEvent.mouseLeave(sidebarPanel());
    await waitFor(() => expect(sidebarPanel().dataset.expanded).toBe('false'));
  });

  it('กดโลโก้ปฏิทินแล้วขยายค้าง และจำไว้หลังรีเฟรชหน้า', async () => {
    const { user } = await openApp();

    await user.click(screen.getByRole('button', { name: 'ขยายเมนูค้างไว้' }));
    expect(sidebarPanel().dataset.expanded).toBe('true');

    // เอาเมาส์ออกแล้วต้องไม่หุบ เพราะปักไว้แล้ว
    fireEvent.mouseLeave(sidebarPanel());
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(sidebarPanel().dataset.expanded).toBe('true');

    cleanup();
    await openApp();
    expect(screen.getByRole('button', { name: 'ย่อเมนู' })).toBeDefined();
    expect(sidebarPanel().dataset.expanded).toBe('true');
  });

  it('ผู้ดูแลเห็นจำนวนรออนุมัติบนเมนู และหายเมื่ออนุมัติครบ', async () => {
    const { user, nav } = await openApp();

    // ข้อมูลตั้งต้นมีคำขอรออนุมัติ 1 รายการ
    const approvals = await within(nav).findByRole('link', { name: /^รออนุมัติ.*มี 1 รายการ/ }, { timeout: 3000 });
    await user.click(approvals);
    await user.click(await screen.findByRole('button', { name: 'อนุมัติ' }, { timeout: 3000 }));

    await waitFor(
      () => expect(within(nav).getByRole('link', { name: 'รออนุมัติ' })).toBeDefined(),
      { timeout: 3000 },
    );
  });
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
    const more = await within(bar).findByRole('button', { name: /เพิ่มเติม.*มี 1 รายการรออนุมัติ/ }, { timeout: 3000 });
    await user.click(more);

    const sheet = screen.getByRole('dialog', { name: 'เมนูเพิ่มเติม' });
    expect(within(sheet).getByRole('link', { name: 'ห้องประชุม' })).toBeDefined();
    expect(within(sheet).getByRole('link', { name: /^รออนุมัติ.*มี 1 รายการ/ })).toBeDefined();
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
    fireEvent.change(start, { target: { value: '15:00' } });
    expect(end.value).toBe('16:00');
  });
});

describe('ห้องไม่ว่าง: บอกตั้งแต่ตอนกรอกฟอร์ม', () => {
  it('เลือกช่วงที่ชน -> เตือนพร้อมเวลาว่าง ปุ่มส่งกดไม่ได้ กดเวลาที่แนะนำแล้วส่งได้', async () => {
    const { user, nav } = await openApp();
    await goTo(user, nav, 'จองห้องประชุม');

    // ข้อมูลตั้งต้น: ห้องประชุมใหญ่ วันนี้ 09:00-10:30 มีคนจองแล้ว ฟอร์มเปิดมาที่ 09:00-10:00
    const warning = await screen.findByRole('alert', {}, { timeout: 3000 });
    expect(warning.textContent).toContain('ห้องนี้ไม่ว่างเวลา 09:00–10:30 น.');
    await user.click(screen.getByLabelText(/ข้าพเจ้าจะดูแลรักษาทรัพย์สิน/));
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
