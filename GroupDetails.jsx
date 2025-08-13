import { useEffect, useState, useMemo } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
} from "firebase/firestore";
import { useParams } from "react-router-dom";
import { db, auth } from "../firebase";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 🎨 Consistent with your ColorHunt Palette
const themeColors = {
  gradient: 'linear-gradient(to right, #4a9782, #dcd0a8)',
  card: '#fff9e5',
  border: '#dcd0a8',
  textPrimary: '#004030',
  textSecondary: '#4a9782',
  muted: '#6b7280',
  accent: '#004030',
  accentText: '#ffffff',
  error: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
};

function GroupDetails() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [membersData, setMembersData] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form states
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");

  // Fetch group data and member names
  useEffect(() => {
    const fetchGroupData = async () => {
      setLoading(true);
      setError("");
      try {
        const groupRef = doc(db, "groups", groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
          throw new Error("Group not found");
        }

        const data = groupSnap.data();
        setGroup(data);

        // Fetch member names
        const names = {};
        const memberPromises = (data.members || []).map(async (uid) => {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            names[uid] = userDoc.data().name || userDoc.data().email?.split('@')[0] || "Unknown";
          } else {
             names[uid] = "Unknown User";
          }
        });

        await Promise.all(memberPromises);
        setMembersData(names);
      } catch (err) {
        console.error("Error fetching group:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId]);

  // Real-time expenses listener
  useEffect(() => {
    if (!groupId) return;

    const expensesQuery = collection(db, "groups", groupId, "expenses");
    const unsubscribe = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const expensesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })).sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        setExpenses(expensesData);
      },
      (err) => {
        console.error("Error listening to expenses:", err);
        setError("Failed to load expenses");
      }
    );

    return () => unsubscribe();
  }, [groupId]);

  // Calculate balances
  const balances = useMemo(() => {
    if (!group || !expenses.length) return {};

    const balances = {};
    const members = group.members || [];

    // Initialize balances
    members.forEach(member => balances[member] = 0);

    // Calculate balances
    expenses.forEach(expense => {
      // Only include expenses where the payer is still in the group
      if (members.includes(expense.paidBy)) {
        balances[expense.paidBy] += expense.amount;
        const amountPerMember = expense.amount / members.length;
        members.forEach(member => {
          balances[member] -= amountPerMember;
        });
      }
    });

    return balances;
  }, [group, expenses]);

  // Generate settlement suggestions
  const settlements = useMemo(() => {
    if (!group || !expenses.length) return [];

    const balanceArray = Object.entries(balances).map(([uid, amount]) => ({
      uid,
      amount,
      name: membersData[uid] || uid,
    })).filter(person => Math.abs(person.amount) > 0.01);

    const creditors = balanceArray
      .filter(person => person.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const debtors = balanceArray
      .filter(person => person.amount < 0)
      .sort((a, b) => a.amount - b.amount);

    let settlements = [];
    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];

      const settleAmount = Math.min(
        creditor.amount,
        Math.abs(debtor.amount)
      );

      if (settleAmount > 0.01) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: settleAmount.toFixed(2)
        });
      }

      creditor.amount -= settleAmount;
      debtor.amount += settleAmount;

      if (creditor.amount < 0.01) creditorIndex++;
      if (Math.abs(debtor.amount) < 0.01) debtorIndex++;
    }

    return settlements;
  }, [balances, membersData, group, expenses]);

  // Add expense handler
  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!description.trim() || !amount || !selectedMember) {
      toast.error("Please fill all fields for the expense.");
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Amount must be a positive number.");
      return;
    }

    try {
      await addDoc(collection(db, "groups", groupId, "expenses"), {
        description: description.trim(),
        amount: parseFloat(amount),
        paidBy: selectedMember,
        createdAt: new Date(),
        createdBy: auth.currentUser.uid,
      });

      // Reset form
      setDescription("");
      setAmount("");
      setSelectedMember("");
      toast.success("Expense added successfully!");
    } catch (err) {
      console.error("Error adding expense:", err);
      toast.error("Failed to add expense: " + err.message);
    }
  };

  // Add member handler
  const handleAddMemberByEmail = async () => {
    const email = newMemberEmail.trim();
    if (!email) {
      setAddMemberError("Please enter a valid email.");
      return;
    }

    setAddingMember(true);
    setAddMemberError("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Authentication required.");

      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) throw new Error("Group not found.");

      const { members, createdBy } = groupSnap.data();

      // Verify permissions
      const isCreator = user.uid === createdBy;
      const isMember = members.includes(user.uid);
      if (!isCreator && !isMember) {
        throw new Error("You do not have permission to add members to this group.");
      }

      // Find user by email
      const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) throw new Error("User with this email is not registered.");

      const newMemberDoc = snapshot.docs[0];
      const newMemberId = newMemberDoc.id;
      const newMemberName = newMemberDoc.data().name || newMemberDoc.data().email.split('@')[0];

      if (members.includes(newMemberId)) {
        throw new Error("This user is already a member of this group.");
      }

      // Update group members array
      await updateDoc(groupRef, {
        members: arrayUnion(newMemberId)
      });

      // Update UI state
      setGroup(prev => ({ ...prev, members: [...(prev.members || []), newMemberId] }));
      setMembersData(prev => ({
        ...prev,
        [newMemberId]: newMemberName
      }));
      setNewMemberEmail("");
      toast.success(`${newMemberName} added successfully!`);
    } catch (err) {
      console.error("Add member failed:", err);
      setAddMemberError(err.message);
      toast.error("Failed to add member: " + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  // Remove member handler
  const handleRemoveMember = async (memberId) => {
    const memberName = membersData[memberId] || 'this member';
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the group?`)) {
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Authentication required.");

      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) throw new Error("Group not found.");

      const { createdBy } = groupSnap.data();

      // Only creator can remove members
      if (user.uid !== createdBy) {
        throw new Error("Only the group creator can remove members.");
      }

      // Can't remove yourself
      if (memberId === user.uid) {
        throw new Error("You can't remove yourself as the creator. Delete the group instead.");
      }

      // Update group members array
      await updateDoc(groupRef, {
        members: arrayRemove(memberId)
      });

      // Update UI state
      setGroup(prev => ({
        ...prev,
        members: prev.members.filter(id => id !== memberId)
      }));
      
      const updatedMembersData = {...membersData};
      delete updatedMembersData[memberId];
      setMembersData(updatedMembersData);

      toast.success(`${memberName} removed successfully!`);
    } catch (err) {
      console.error("Remove member failed:", err);
      toast.error("Failed to remove member: " + err.message);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex justify-center items-center" 
        style={{ background: themeColors.gradient }}
      >
        <div className="flex flex-col items-center" style={{ color: themeColors.textPrimary }}>
          <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-xl mt-3">Loading group data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen flex justify-center items-center" 
        style={{ background: themeColors.gradient }}
      >
        <div 
          className="text-xl p-6 rounded-2xl shadow-md flex items-center" 
          style={{ 
            backgroundColor: themeColors.card, 
            color: themeColors.error,
            border: `1px solid ${themeColors.border}`
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen font-sans" 
      style={{ background: themeColors.gradient }}
    >
      {/* Header */}
      <header 
        className="p-5 shadow-lg" 
        style={{ background: themeColors.accent }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-extrabold mb-3 sm:mb-0 text-white">
            {group?.name || 'Group Details'}
          </h1>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Group link copied to clipboard!");
            }}
            className="px-4 py-2 rounded-full transition duration-300 ease-in-out text-sm font-medium shadow-sm hover:shadow-md"
            style={{ 
              backgroundColor: themeColors.textSecondary, 
              color: themeColors.accentText 
            }}
          >
            Share Group
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 lg:grid lg:grid-cols-3 gap-6 py-8">
        {/* Left Column - Member & Add Expense */}
        <div className="lg:col-span-2 space-y-6">
          {/* Members Card */}
          <section 
            className="rounded-2xl p-6 shadow-md border" 
            style={{ 
              backgroundColor: themeColors.card, 
              borderColor: themeColors.border 
            }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5">
              <h2 
                className="text-xl font-bold mb-4 sm:mb-0" 
                style={{ color: themeColors.textPrimary }}
              >
                Members
              </h2>
              <div className="relative flex items-center w-full sm:w-auto">
                <input
                  type="email"
                  placeholder="Add member by email..."
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#4a9782] transition-all duration-200 shadow-sm"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary
                  }}
                />
                <button
                  onClick={handleAddMemberByEmail}
                  disabled={addingMember}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full hover:shadow-md transition duration-200 flex items-center justify-center"
                  style={{
                    backgroundColor: themeColors.textSecondary,
                    color: themeColors.accentText,
                    opacity: addingMember ? 0.5 : 1,
                    cursor: addingMember ? 'not-allowed' : 'pointer'
                  }}
                  title="Add Member"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {(group?.members || []).map((uid) => (
                <div 
                  key={uid} 
                  className="flex items-center rounded-full px-3 py-1.5 text-sm font-medium border shadow-sm relative group"
                  style={{
                    backgroundColor: uid === auth.currentUser?.uid ? themeColors.textSecondary : '#f8fafc',
                    borderColor: themeColors.border,
                    color: uid === auth.currentUser?.uid ? themeColors.accentText : themeColors.textPrimary
                  }}
                >
                  <div 
                    className="h-6 w-6 rounded-full flex items-center justify-center mr-2 font-semibold text-xs"
                    style={{
                      backgroundColor: uid === auth.currentUser?.uid ? themeColors.accent : themeColors.border,
                      color: uid === auth.currentUser?.uid ? themeColors.accentText : themeColors.textPrimary
                    }}
                  >
                    <span>{membersData[uid]?.charAt(0).toUpperCase() || '?'}</span>
                  </div>
                  <span>{membersData[uid] || uid.substring(0, 6) + '...'}</span>
                  {auth.currentUser?.uid === group?.createdBy && uid !== auth.currentUser?.uid && (
                    <button
                      onClick={() => handleRemoveMember(uid)}
                      className="ml-2 transition-colors duration-200 hover:text-red-700"
                      style={{ color: themeColors.error }}
                      title="Remove member"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {addMemberError && (
              <p className="text-sm mt-3 flex items-center" style={{ color: themeColors.error }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.344a1.5 1.5 0 012.986 0l3.924 10.465A1.5 1.5 0 0113.924 15H6.076a1.5 1.5 0 01-1.243-2.191L8.257 3.344zM10 12a1 1 0 100-2 1 1 0 000 2zm-1 4a1 1 0 102 0 1 1 0 00-2 0z" clipRule="evenodd" />
                </svg>
                {addMemberError}
              </p>
            )}
          </section>

          {/* Add Expense Card */}
          <section 
            className="rounded-2xl p-6 shadow-md border" 
            style={{ 
              backgroundColor: themeColors.card, 
              borderColor: themeColors.border 
            }}
          >
            <h2 
              className="text-xl font-bold mb-5" 
              style={{ color: themeColors.textPrimary }}
            >
              Add New Expense
            </h2>
            <form onSubmit={handleAddExpense} className="space-y-5">
              <div>
                <label 
                  htmlFor="description" 
                  className="block text-sm font-medium mb-2" 
                  style={{ color: themeColors.textSecondary }}
                >
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a9782] transition-all duration-200 shadow-sm"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary
                  }}
                  placeholder="e.g., Groceries, Rent, Trip to Ooty"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label 
                    htmlFor="amount" 
                    className="block text-sm font-medium mb-2" 
                    style={{ color: themeColors.textSecondary }}
                  >
                    Amount
                  </label>
                  <div className="relative">
                    <span 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base"
                      style={{ color: themeColors.textSecondary }}
                    >
                      ₹
                    </span>
                    <input
                      type="number"
                      id="amount"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a9782] transition-all duration-200 shadow-sm"
                      style={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: themeColors.border,
                        color: themeColors.textPrimary
                      }}
                      placeholder="123.45"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label 
                    htmlFor="paidBy" 
                    className="block text-sm font-medium mb-2" 
                    style={{ color: themeColors.textSecondary }}
                  >
                    Paid by
                  </label>
                  <select
                    id="paidBy"
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a9782] transition-all duration-200 shadow-sm"
                    style={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: themeColors.border,
                      color: themeColors.textPrimary
                    }}
                    required
                  >
                    <option value="">Select member</option>
                    {(group?.members || []).map((uid) => (
                      <option key={uid} value={uid}>
                        {membersData[uid] || uid.substring(0, 6) + '...'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 font-bold rounded-full hover:shadow-md transition"
                style={{ 
                  backgroundColor: themeColors.accent, 
                  color: themeColors.accentText
                }}
              >
                Add Expense
              </button>
            </form>
          </section>

          {/* Expenses List */}
          <section 
            className="rounded-2xl p-6 shadow-md border" 
            style={{ 
              backgroundColor: themeColors.card, 
              borderColor: themeColors.border 
            }}
          >
            <h2 
              className="text-xl font-bold mb-5" 
              style={{ color: themeColors.textPrimary }}
            >
              All Expenses
            </h2>
            {expenses.length === 0 ? (
              <div className="text-center py-6" style={{ color: themeColors.muted }}>
                <p className="text-sm">📊 No expenses yet. Start by adding one!</p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: themeColors.border }}>
                {expenses.map((exp) => (
                  <li 
                    key={exp.id} 
                    className="py-3 flex justify-between items-center group hover:bg-opacity-50 transition duration-150 rounded-lg px-2 -mx-2"
                    style={{ 
                      backgroundColor: exp.paidBy === auth.currentUser?.uid ? `${themeColors.textSecondary}20` : 'transparent',
                      borderColor: themeColors.border
                    }}
                  >
                    <div>
                      <p className="font-medium text-base" style={{ color: themeColors.textPrimary }}>
                        {exp.description}
                      </p>
                      <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
                        Paid by <span className="font-semibold" style={{ color: themeColors.accent }}>
                          {membersData[exp.paidBy] || exp.paidBy.substring(0, 6) + '...'}
                        </span>
                        <span className="ml-2 text-xs" style={{ color: themeColors.muted }}>
                          {new Date(exp.createdAt?.toDate ? exp.createdAt.toDate() : exp.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </span>
                      </p>
                    </div>
                    <span className="font-bold text-lg" style={{ color: themeColors.success }}>
                      ₹{exp.amount.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right Column - Balances & Settle Up */}
        <div className="space-y-6 lg:col-span-1">
          {/* Balances Card */}
          <section 
            className="rounded-2xl p-6 shadow-md border" 
            style={{ 
              backgroundColor: themeColors.card, 
              borderColor: themeColors.border 
            }}
          >
            <h2 
              className="text-xl font-bold mb-5" 
              style={{ color: themeColors.textPrimary }}
            >
              Current Balances
            </h2>
            {Object.keys(balances).length === 0 ? (
              <div className="text-center py-4" style={{ color: themeColors.muted }}>
                <p>No balances to display yet.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {Object.entries(balances).map(([uid, balance]) => (
                  <li 
                    key={uid} 
                    className="flex justify-between items-center p-3 rounded-lg border shadow-sm"
                    style={{ 
                      backgroundColor: '#f8fafc',
                      borderColor: themeColors.border
                    }}
                  >
                    <div className="flex items-center">
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center mr-3 font-semibold text-sm"
                        style={{ 
                          backgroundColor: themeColors.border,
                          color: themeColors.textPrimary
                        }}
                      >
                        <span>{membersData[uid]?.charAt(0).toUpperCase() || '?'}</span>
                      </div>
                      <span className="text-base font-medium" style={{ color: themeColors.textPrimary }}>
                        {membersData[uid] || uid.substring(0, 6) + '...'}
                      </span>
                    </div>
                    <span 
                      className={`font-bold text-lg ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {balance >= 0 ? `+₹${balance.toFixed(2)}` : `-₹${Math.abs(balance).toFixed(2)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Settle Up Card */}
          <section 
            className="rounded-2xl p-6 shadow-md border" 
            style={{ 
              backgroundColor: themeColors.card, 
              borderColor: themeColors.border 
            }}
          >
            <h2 
              className="text-xl font-bold mb-5" 
              style={{ color: themeColors.textPrimary }}
            >
              Suggested Settlements
            </h2>
            {settlements.length === 0 ? (
              <div 
                className="text-center py-6 rounded-lg border" 
                style={{ 
                  backgroundColor: `${themeColors.success}10`,
                  borderColor: themeColors.success,
                  color: themeColors.success
                }}
              >
                <p className="text-xl font-semibold">All settled!</p>
                <p className="text-sm">No outstanding balances.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {settlements.map((s, i) => (
                  <li 
                    key={i} 
                    className="p-4 rounded-lg border shadow-sm"
                    style={{ 
                      backgroundColor: `${themeColors.warning}10`,
                      borderColor: themeColors.warning
                    }}
                  >
                    <span className="text-base" style={{ color: themeColors.textPrimary }}>
                      <span style={{ color: themeColors.error }}>{s.from}</span> pays{" "}
                      <span className="font-bold" style={{ color: themeColors.success }}>₹{s.amount}</span> to{" "}
                      <span style={{ color: themeColors.textSecondary }}>{s.to}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <ToastContainer 
        position="bottom-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="colored" 
      />
    </div>
  );
}

export default GroupDetails;