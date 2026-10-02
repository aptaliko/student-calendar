import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Σύνδεση' };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
