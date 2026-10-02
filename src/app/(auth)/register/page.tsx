import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Δημιουργία λογαριασμού' };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
