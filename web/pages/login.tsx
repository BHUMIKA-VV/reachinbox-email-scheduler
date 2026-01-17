import Head from "next/head";

export default function Login() {
  const handleLogin = () => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    window.location.href = `${API}/auth/google`;
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Head>
        <title>Login</title>
      </Head>
      <div className="p-8 bg-white rounded shadow w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold mb-6">ReachInbox</h1>
        <button
          onClick={handleLogin}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
