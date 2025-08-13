import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { auth } from "./firebase"; // ensure this path is correct
import Login from "./pages/Login";
import Register from "./pages/Register";
import CreateGroup from "./pages/CreateGroup";
import Dashboard from "./pages/Dashboard";
import GroupDetails from "./pages/GroupDetails";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-xl">
        Loading...
      </div>
    );

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" replace />}
        />
        <Route
          path="/register"
          element={!user ? <Register /> : <Navigate to="/" replace />}
        />
        <Route
          path="/create-group"
          element={user ? <CreateGroup /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/group/:groupId"
          element={user ? <GroupDetails /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
