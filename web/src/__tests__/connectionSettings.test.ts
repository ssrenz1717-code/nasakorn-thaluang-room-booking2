import { describe, expect, it } from 'vitest';
import { extractConnectionId, validateConnectionField } from '../lib/connectionSettings';

describe('ตรวจลิงก์การเชื่อมต่อ', () => {
  it('Web App URL: รับ /exec ทั้งบัญชีส่วนตัวและบัญชีองค์กร ไม่รับ /dev', () => {
    expect(validateConnectionField('endpointUrl', 'https://script.google.com/macros/s/AKfycbx123456789abc/exec')).toBe('');
    expect(validateConnectionField('endpointUrl', 'https://script.google.com/a/macros/thaluang.ac.th/s/AKfycbx123456789abc/exec')).toBe('');
    expect(validateConnectionField('endpointUrl', 'https://script.google.com/macros/s/AKfycbx123456789abc/dev')).not.toBe('');
    expect(validateConnectionField('endpointUrl', 'http://script.google.com/macros/s/AKfycbx123456789abc/exec')).not.toBe('');
  });

  it('ลิงก์ชีตและโฟลเดอร์: ดึงรหัสออกมาได้ แม้มี /edit หรือ ?usp=sharing ต่อท้าย', () => {
    const sheet = 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0';
    expect(validateConnectionField('sheetUrl', sheet)).toBe('');
    expect(extractConnectionId('sheetUrl', sheet)).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789');
    const folder = 'https://drive.google.com/drive/folders/1ZyXwVuTsRqPoNm?usp=sharing';
    expect(validateConnectionField('driveUrl', folder)).toBe('');
    expect(extractConnectionId('driveUrl', folder)).toBe('1ZyXwVuTsRqPoNm');
  });

  it('ใส่ลิงก์ผิดช่องต้องเตือน และช่องว่างยังไม่บังคับ', () => {
    expect(validateConnectionField('sheetUrl', 'https://drive.google.com/drive/folders/1ZyXwVuTsRqPoNm')).not.toBe('');
    expect(validateConnectionField('driveUrl', 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789')).not.toBe('');
    expect(validateConnectionField('endpointUrl', '   ')).toBe('');
  });
});
