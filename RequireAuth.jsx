import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

function RequireAuth({ children }) {
  const user = auth.currentUser;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RequireAuth;
