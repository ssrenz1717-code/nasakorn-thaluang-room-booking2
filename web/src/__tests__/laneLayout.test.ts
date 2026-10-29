import { describe, expect, it } from 'vitest';
import { layoutLanes } from '../features/booking/laneLayout';

describe('layoutLanes', () => {
  it('รายการที่ไม่ชนกันได้เต็มความกว้าง', () => {
    const lanes = layoutLanes([
      { id: 'a', startMin: 540, endMin: 600 },
      { id: 'b', startMin: 600, endMin: 660 },
    ]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 1 });
    expect(lanes.get('b')).toEqual({ lane: 0, lanes: 1 });
  });

  it('สองห้องจองเวลาซ้อนกัน -> แยกคนละครึ่ง ไม่ทับกัน', () => {
    const lanes = layoutLanes([
      { id: 'a', startMin: 540, endMin: 630 },
      { id: 'b', startMin: 570, endMin: 720 },
    ]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
  });

  it('เลนว่างแล้วนำกลับมาใช้ได้ และทั้งกลุ่มใช้จำนวนเลนเท่ากัน', () => {
    const lanes = layoutLanes([
      { id: 'a', startMin: 540, endMin: 600 },
      { id: 'b', startMin: 550, endMin: 700 },
      { id: 'c', startMin: 610, endMin: 650 },
      { id: 'd', startMin: 800, endMin: 860 },
    ]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get('c')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('d')).toEqual({ lane: 0, lanes: 1 });
  });
});
