/**
 * จัดรายการที่เวลาซ้อนกันให้อยู่คนละเลน (ปฏิทินแสดงทุกห้องรวมกัน สองห้องจองเวลาเดียวกันได้)
 * ถ้าวางทับกันตรง ๆ รายการหลังจะบังรายการแรกจนอ่านไม่ได้
 *
 * กลุ่ม = ชุดรายการที่ซ้อนกันต่อเนื่อง ทุกรายการในกลุ่มแบ่งความกว้างเท่ากันตามจำนวนเลนของกลุ่ม
 * รายการที่ไม่ชนกับใครได้เต็มความกว้าง
 */
export interface LaneItem {
  id: string;
  startMin: number;
  endMin: number;
}

export interface LanePlacement {
  lane: number;
  lanes: number;
}

export function layoutLanes(items: LaneItem[]): Map<string, LanePlacement> {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const result = new Map<string, LanePlacement>();
  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    for (const item of cluster) result.set(item.id, { lane: item.lane, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.startMin >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    cluster.push({ id: item.id, lane });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();
  return result;
}
