import { timeToMinutes } from './dates';

type Timed = { id: number; startTime: string; durationMinutes: number };
export type Placed<T> = { item: T; lane: number; lanes: number; start: number; end: number };

/**
 * Side-by-side layout for one day's lessons in a time grid: overlapping lessons form a
 * cluster, each gets the first free lane, and everything in a cluster shares its lane count.
 */
export function layoutDay<T extends Timed>(items: T[]): Placed<T>[] {
  const sorted = [...items]
    .map((item) => {
      const start = timeToMinutes(item.startTime);
      return { item, start, end: start + item.durationMinutes, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: Placed<T>[] = [];
  let cluster: typeof sorted = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const p of sorted) {
    if (p.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= p.start);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = p.end;
    p.lane = lane;
    cluster.push(p);
    clusterEnd = Math.max(clusterEnd, p.end);
  }
  flush();
  return out;
}
