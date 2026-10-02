import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="brand-text text-6xl font-extrabold">404</p>
      <p className="mt-2 text-base-content/60">Η σελίδα δεν βρέθηκε.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Επιστροφή στο Σήμερα
      </Link>
    </div>
  );
}
