'use client';

import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, EllipsisVertical, Trash2 } from 'lucide-react';
import type { Student } from '@/db/schema';
import { api } from '@/lib/api';
import { useToast } from './Toast';

export default function StudentMenu({ student }: { student: Student }) {
  const router = useRouter();
  const toast = useToast();

  async function toggleArchive() {
    await api(`/api/students/${student.id}`, 'PATCH', { archived: !student.archived });
    toast(student.archived ? 'Student restored' : 'Student archived');
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete ${student.name} and ALL their lessons? This cannot be undone. Archiving keeps their history.`)) return;
    await api(`/api/students/${student.id}`, 'DELETE');
    toast('Student deleted');
    router.replace('/students');
    router.refresh();
  }

  return (
    <div className="dropdown dropdown-end">
      <button tabIndex={0} className="btn btn-ghost btn-sm btn-square" aria-label="More">
        <EllipsisVertical className="size-5" />
      </button>
      <ul tabIndex={0} className="menu dropdown-content z-20 w-56 rounded-box bg-base-100 p-2 shadow-xl">
        <li>
          <button onClick={toggleArchive}>
            {student.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {student.archived ? 'Restore student' : 'Archive student'}
          </button>
        </li>
        <li>
          <button onClick={remove} className="text-error">
            <Trash2 className="size-4" /> Delete permanently
          </button>
        </li>
      </ul>
    </div>
  );
}
