// ✅ Create Group Page with UI and Theming Consistency
import { useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

// 🎨 Theme from ColorHunt Palette
const themeColors = {
  gradient: 'linear-gradient(to right, #4a9782, #dcd0a8)',
  card: '#fff9e5',
  border: '#dcd0a8',
  textPrimary: '#004030',
  textSecondary: '#4a9782',
  accent: '#004030',
  accentText: '#ffffff',
};

function CreateGroup() {
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to create a group.");
      return;
    }

    setLoading(true);

    try {
      const groupRef = await addDoc(collection(db, "groups"), {
        name: groupName,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
      });

      const groupId = groupRef.id;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const currentGroups = userSnap.data().groups || [];
        await updateDoc(userRef, {
          groups: [...currentGroups, groupId],
        });
      } else {
        await setDoc(userRef, {
          groups: [groupId],
        });
      }

      navigate(`/group/${groupId}`);
    } catch (error) {
      console.error("Group creation failed:", error);
      alert("Error creating group: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: themeColors.gradient }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-xl border backdrop-blur-md"
        style={{ backgroundColor: themeColors.card, border: `1px solid ${themeColors.border}` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm text-left text-[#4a9782] hover:underline"
        >
          ← Go Back
        </button>

        <h2 className="text-2xl font-bold text-center mb-4" style={{ color: themeColors.textPrimary }}>
          Create a New Group
        </h2>
        <form onSubmit={handleCreateGroup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: themeColors.textSecondary }}>
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a9782]"
              style={{ backgroundColor: '#ffffff', border: `1px solid ${themeColors.border}`, color: themeColors.textPrimary }}
              placeholder="Enter group name"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-bold rounded-full hover:shadow-md transition"
            style={{ backgroundColor: loading ? '#033d2d' : themeColors.accent, color: themeColors.accentText, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateGroup;