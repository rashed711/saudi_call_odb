
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers, saveUser, deleteUser, toggleUserStatus } from '../services/mockBackend';
import { Icons } from './Icons';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
      id: 0,
      username: '',
      name: '',
      email: '',
      role: 'user',
      password: '',
      isActive: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
      setLoading(true);
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
  };

  const handleOpenModal = (user?: User) => {
      if (user) {
          setFormData({ ...user, password: '' });
      } else {
          setFormData({
              id: 0,
              username: '',
              name: '',
              email: '',
              role: 'user',
              password: '',
              isActive: true
          });
      }
      setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
      if (window.confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) {
          await deleteUser(id);
          loadUsers();
      }
  };

  const handleToggleStatus = async (id: number) => {
      await toggleUserStatus(id);
      loadUsers();
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.username || !formData.name) return;
      
      if (!formData.id && !formData.password) {
          alert('يجب إدخال كلمة مرور للمستخدم الجديد');
          return;
      }

      await saveUser(formData as User);
      setIsModalOpen(false);
      loadUsers();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
       <div className="p-6 border-b border-gray-100 flex justify-between items-center">
           <div className="flex items-center gap-3">
               <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                   <Icons.Users />
               </div>
               <div>
                   <h2 className="text-xl font-bold text-gray-800">إدارة المستخدمين</h2>
                   <p className="text-sm text-gray-500">{users.length} مستخدم مسجل</p>
               </div>
           </div>
           <button 
            onClick={() => handleOpenModal()}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-bold"
           >
               <Icons.Plus />
               <span>إضافة مستخدم</span>
           </button>
       </div>

       <div className="overflow-x-auto">
           <table className="w-full text-right">
               <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                   <tr>
                       <th className="px-6 py-3">الاسم</th>
                       <th className="px-6 py-3">اسم المستخدم</th>
                       <th className="px-6 py-3">الصلاحية</th>
                       <th className="px-6 py-3">الحالة</th>
                       <th className="px-6 py-3">إجراءات</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                   {loading ? (
                        <tr><td colSpan={5} className="text-center py-8 text-gray-500">جاري تحميل المستخدمين...</td></tr>
                   ) : users.map(user => (
                       <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4 whitespace-nowrap">
                               <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                                       {user.name.charAt(0)}
                                   </div>
                                   <div>
                                       <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                       <div className="text-xs text-gray-500">{user.email}</div>
                                   </div>
                               </div>
                           </td>
                           <td className="px-6 py-4 text-sm font-mono text-gray-600">{user.username}</td>
                           <td className="px-6 py-4">
                               <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                   {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                               </span>
                           </td>
                           <td className="px-6 py-4">
                               <button 
                                onClick={() => handleToggleStatus(user.id)}
                                className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 border transition-all ${user.isActive ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-red-50 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'}`}
                                title="اضغط للتغيير"
                               >
                                   {user.isActive ? <Icons.Check /> : <Icons.Ban />}
                                   <span>{user.isActive ? 'نشط' : 'موقوف'}</span>
                               </button>
                           </td>
                           <td className="px-6 py-4">
                               <div className="flex items-center gap-2">
                                   <button onClick={() => handleOpenModal(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="تعديل">
                                       <Icons.Edit />
                                   </button>
                                   {user.username !== 'admin' && (
                                       <button onClick={() => handleDelete(user.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="حذف">
                                           <Icons.Trash />
                                       </button>
                                   )}
                               </div>
                           </td>
                       </tr>
                   ))}
               </tbody>
           </table>
       </div>

       {/* User Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-gray-800">
                {formData.id ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الدخول</label>
                    <input
                    type="text"
                    required
                    value={formData.username}
                    disabled={!!formData.id} 
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الصلاحية</label>
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    >
                        <option value="user">مستخدم</option>
                        <option value="admin">مدير</option>
                    </select>
                  </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Icons.Lock />
                      <span>كلمة المرور</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
                    placeholder={formData.id ? "اتركه فارغاً إذا لم ترد التغيير" : "مطلوب"}
                  />
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700 select-none">الحساب مفعل</label>
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:opacity-90 text-white py-3 rounded-lg transition-colors font-medium shadow-lg"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
