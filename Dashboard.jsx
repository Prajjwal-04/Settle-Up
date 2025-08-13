// ✅ Dashboard Page with Member Names and Polished UI
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";

// 🎨 ColorHunt Palette
const themeColors = {
  background: 'linear-gradient(to right, #4a9782, #dcd0a8)',
  card: '#fff9e5',
  border: '#dcd0a8',
  textPrimary: '#004030',
  textSecondary: '#4a9782',
  muted: '#6b7280',
  accent: '#004030',
  accentText: '#ffffff',
};

function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [userMap, setUserMap] = useState({});
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    if (loading || !user) return;

    const fetchGroups = async () => {
      const q = query(
        collection(db, "groups"),
        where("members", "array-contains", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const groupList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const allUIDs = [...new Set(groupList.flatMap(group => group.members))];
      const users = {};
      for (const uid of allUIDs) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          users[uid] = userDoc.data().name || uid;
        } else {
          users[uid] = uid;
        }
      }
      setUserMap(users);
      setGroups(groupList);
    };

    fetchGroups();
  }, [user, loading]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: themeColors.background }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1
            className="text-3xl font-bold"
            style={{ color: themeColors.textPrimary }}
          >
            Your Groups
          </h1>
          <div className="space-x-2">
            <button
              onClick={() => navigate("/create-group")}
              className="px-4 py-2 font-semibold rounded-full shadow hover:shadow-md transition"
              style={{ backgroundColor: themeColors.textSecondary, color: themeColors.accentText }}
            >
              + Create Group
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 font-semibold rounded-full shadow hover:shadow-md transition"
              style={{ backgroundColor: '#b91c1c', color: themeColors.accentText }}
            >
              Logout
            </button>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-20 text-lg font-medium" style={{ color: themeColors.muted }}>
            You have no groups. Create one!
          </div>
        ) : (
          <ul className="space-y-4">
            {groups.map((group) => (
              <li
                key={group.id}
                className="p-6 rounded-2xl cursor-pointer border shadow hover:shadow-md transition"
                style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
                onClick={() => navigate(`/group/${group.id}`)}
              >
                <h2 className="text-xl font-semibold mb-1" style={{ color: themeColors.textPrimary }}>
                  {group.name}
                </h2>
                <p className="text-sm" style={{ color: themeColors.textSecondary }}>
                  Members: {group.members.map(uid => userMap[uid] || uid).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
