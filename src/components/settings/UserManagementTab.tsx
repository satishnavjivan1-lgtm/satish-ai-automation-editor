'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Lock,
  RefreshCw,
  X,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';

interface UserItem {
  id: number;
  companyId: number;
  companyName: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'BILLING_OPERATOR' | 'ACCOUNTANT';
  pin: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export function UserManagementTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'BILLING_OPERATOR',
    password: '',
    pin: '1234',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'BILLING_OPERATOR',
    pin: '1234',
    isActive: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    newPin: '',
  });

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
      } else {
        setErrorMsg(data.error || 'યુઝર્સ લોડ કરવામાં ભૂલ આવી');
      }
    } catch {
      setErrorMsg('નેટવર્ક એરર આવી છે.');
    } finally {
      setLoading(false);
    }
  };

  // Add User
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('નવો યુઝર સફળતાપૂર્વક ઉમેરાઈ ગયો!');
        setShowAddModal(false);
        setAddForm({
          name: '',
          username: '',
          email: '',
          phone: '',
          role: 'BILLING_OPERATOR',
          password: '',
          pin: '1234',
        });
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'યુઝર બનાવવામાં ભૂલ આવી');
      }
    } catch {
      setErrorMsg('સર્વર સાથે કનેક્ટ થવામાં ભૂલ આવી');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('યુઝરની વિગતો અપડેટ થઈ ગઈ!');
        setShowEditModal(false);
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'અપડેટ કરવામાં ભૂલ આવી');
      }
    } catch {
      setErrorMsg('સર્વર સાથે કનેક્ટ થવામાં ભૂલ આવી');
    } finally {
      setActionLoading(false);
    }
  };

  // Direct Backend Password & PIN Reset
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: passwordForm.newPassword,
          pin: passwordForm.newPin,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(`યુઝર (${selectedUser.name}) નો પાસવર્ડ અને PIN સફળતાપૂર્વક બદલાઈ ગયો!`);
        setShowPasswordModal(false);
        setPasswordForm({ newPassword: '', newPin: '' });
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'પાસવર્ડ બદલવામાં ભૂલ આવી');
      }
    } catch {
      setErrorMsg('સર્વર સાથે કનેક્ટ થવામાં ભૂલ આવી');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User
  const handleDelete = async (user: UserItem) => {
    if (!confirm(`શું તમે ખરેખર યુઝર "${user.name}" (${user.username}) ને ડિલીટ કરવા માંગો છો?`)) {
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('યુઝર ડિલીટ થઈ ગયો છે.');
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'ડિલીટ કરવામાં ભૂલ આવી');
      }
    } catch {
      setErrorMsg('સર્વર સાથે કનેક્ટ થવામાં ભૂલ આવી');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">Super Admin</span>;
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">Admin</span>;
      case 'MANAGER':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">Manager</span>;
      case 'ACCOUNTANT':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">Accountant</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">Billing Operator</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            <span>યુઝર્સ મેનેજમેન્ટ (User &amp; Staff Management)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            સિસ્ટમમાં કામ કરતા કર્મચારીઓ ઉમેરો, પાસવર્ડ/PIN સેટ કરો અથવા અધિકારો બદલો
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 active:scale-95 text-white text-sm font-semibold shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ નવો યુઝર ઉમેરો (Add User)</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-sm">યુઝર્સ લોડ થઈ રહ્યા છે...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="font-semibold text-gray-700">કોઈ યુઝર મળ્યા નથી</p>
            <p className="text-xs text-gray-500 mt-1">
              ઉપર આપેલા "+ નવો યુઝર ઉમેરો" બટન પર ક્લિક કરીને નવો સ્ટાફ ઉમેરો.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">નામ / યુઝરનેમ</th>
                  <th className="py-3 px-4">ઈમેલ &amp; ફોન</th>
                  <th className="py-3 px-4">રોલ (Role)</th>
                  <th className="py-3 px-4 text-center">૪-અંક PIN</th>
                  <th className="py-3 px-4 text-center">સ્ટેટસ</th>
                  <th className="py-3 px-4 text-right">ક્રિયાઓ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500 font-mono">@{u.username}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-gray-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{u.email}</span>
                      </div>
                      {u.phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-800">
                      {u.pin || '1234'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Direct Backend Password Reset */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setPasswordForm({ newPassword: '', newPin: u.pin || '1234' });
                            setShowPasswordModal(true);
                          }}
                          title="પાસવર્ડ અથવા PIN સીધો બદલો"
                          className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors border border-amber-200"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {/* Edit details */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setEditForm({
                              name: u.name,
                              username: u.username,
                              email: u.email,
                              phone: u.phone || '',
                              role: u.role,
                              pin: u.pin || '1234',
                              isActive: u.isActive,
                            });
                            setShowEditModal(true);
                          }}
                          title="વિગતો સુધારો"
                          className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors border border-blue-200"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          title="યુઝર ડિલીટ કરો"
                          className="p-1.5 rounded-lg text-red-700 hover:bg-red-50 transition-colors border border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: ADD NEW USER ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-700" />
                <span>નવો યુઝર ઉમેરો (Add New User)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    પૂરું નામ (Full Name) *
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="દા.ત. રમેશભાઈ"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    યુઝરનેમ (Username) *
                  </label>
                  <input
                    type="text"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="ramesh1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ઈમેલ (Email) *
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="ramesh@gmail.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    મોબાઈલ નંબર (Phone)
                  </label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    રોલ (Role) *
                  </label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  >
                    <option value="BILLING_OPERATOR">Billing Operator</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    પ્રારંભિક પાસવર્ડ *
                  </label>
                  <input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ૪-અંક PIN *
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={addForm.pin}
                    onChange={(e) => setAddForm({ ...addForm, pin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-center font-bold tracking-widest"
                    placeholder="1234"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  રદ કરો (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'સેવ થઈ રહ્યું છે...' : 'સેવ કરો (Save User)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT USER DETAILS ─── */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-700" />
                <span>યુઝર વિગતો સુધારો: {selectedUser.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    પૂરું નામ *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    યુઝરનેમ *
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ઈમેલ *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    મોબાઈલ નંબર
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    રોલ (Role) *
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  >
                    <option value="BILLING_OPERATOR">Billing Operator</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ૪-અંક PIN *
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editForm.pin}
                    onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-center font-bold tracking-widest"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    સ્ટેટસ
                  </label>
                  <select
                    value={editForm.isActive ? 'true' : 'false'}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isActive: e.target.value === 'true' })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  >
                    <option value="true">Active (ચાલુ)</option>
                    <option value="false">Inactive (બંધ)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'અપડેટ થઈ રહ્યું છે...' : 'અપડેટ કરો (Update)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DIRECT BACKEND PASSWORD & PIN OVERRIDE ─── */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <span>પાસવર્ડ / PIN સીધો સેટ કરો</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              તમે યુઝર <strong>{selectedUser.name}</strong> (@{selectedUser.username}) માટે
              OTP વગર સીધો જ નવો પાસવર્ડ અને PIN સેટ કરી રહ્યા છો.
            </p>

            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  નવો પાસવર્ડ (New Password) *
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-none"
                  placeholder="નવો પાસવર્ડ દાખલ કરો"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  નવો ૪-અંક PIN (New PIN)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={passwordForm.newPin}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPin: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-none text-center font-bold tracking-widest"
                  placeholder="1234"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'સેવ થઈ રહ્યું છે...' : 'પાસવર્ડ બદલો (Save Password)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
