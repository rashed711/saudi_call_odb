
import React, { useState, useEffect } from 'react';
import { User, Permission, PermissionResource, PermissionAction } from '../types';
import { getUsers, saveUser, deleteUser, toggleUserStatus, getSession, hasPermission } from '../services/mockBackend';
import { Icons } from './Icons';

const RESOURCES: { id: PermissionResource; label: string }[] = [
  { id: 'dashboard', label: 'لوحة التحكم' },
  { id: 'odb', label: 'مواقع ODB' },
  { id: 'nearby', label: 'الأماكن القريبة' },
  { id: 'users', label: 'المستخدمين' },
  { id: 'settings', label: 'الإعدادات' },
  { id: 'my_activity', label: 'نشاطي (للمناديب)' },
];

const ACTIONS: { id: PermissionAction; label: string }[] = [
  { id: 'view', label: 'عرض' },
  { id: 'create', label: 'إضافة' },
  { id: 'edit', label: 'تعديل' },
  { id: 'delete', label: 'حذف' },
  { id: 'export', label: 'تصدير' },
];

const UserManagement: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(getSession());
  const [users, setUsers] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Save Loading State
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
      id: 0, username: '', name: '', email: '', role: 'delegate', password: '', isActive: true, permissions: [], supervisorId: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const data = await getUsers(currentUser);
        setUsers(data);
        setSupervisors(data.filter(u => u.role === 'admin' || u.role === 'supervisor'));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
  };

  const handleOpenModal = (userToEdit?: User) => {
      setModalError(null);
      if (userToEdit) {
          setFormData({ ...userToEdit, password: '' });
      } else {
          const defaultRole = currentUser?.role === 'supervisor' ? 'delegate' : 'supervisor';
          const defaultSupervisor = currentUser?.role === 'supervisor' ? currentUser.id : null;
          
          setFormData({
              id: 0, username: '', name: '', email: '', role: defaultRole,
              password: '', isActive: true, supervisorId: defaultSupervisor, permissions: []
          });
          handleRoleChange(defaultRole, true);
      }
      setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: string, isNew: boolean = false) => {
      let defaults: Permission[] = [];
      if (newRole === 'admin') {
          defaults = RESOURCES.map(r => ({ resource: r.id, actions: ['view', 'create', 'edit', 'delete', 'export'] }));
      } else if (newRole === 'supervisor') {
          defaults = [
              { resource: 'dashboard', actions: ['view'] },
              { resource: 'odb', actions: ['view', 'create', 'edit'] },
              { resource: 'nearby', actions: ['view'] },
              { resource: 'users', actions: ['view', 'create', 'edit'] },
              { resource: 'my_activity', actions: ['view'] }
          ];
      } else { 
          defaults = [
              { resource: 'dashboard', actions: ['view'] },
              { resource: 'odb', actions: ['view'] },
              { resource: 'nearby', actions: ['view'] },
              { resource: 'my_activity', actions: ['view', 'edit'] }
          ];
      }

      setFormData(prev => ({
          ...prev,
          role: newRole as any,
          permissions: isNew ? defaults : (prev.permissions && prev.permissions.length > 0 ? prev.permissions : defaults)
      }));
  };

  const togglePermission = (resource: PermissionResource, action: PermissionAction) => {
      setFormData(prev => {
          const currentPerms = prev.permissions || [];
          const resourcePerm = currentPerms.find(p => p.resource === resource);
          let newPerms;
          if (resourcePerm) {
              const hasAction = resourcePerm.actions.includes(action);
              const newActions = hasAction ? resourcePerm.actions.filter(a => a !== action) : [...resourcePerm.actions, action];
              newPerms = currentPerms.map(p => p.resource === resource ? { ...p, actions: newActions } : p);
          } else {
              newPerms = [...currentPerms, { resource, actions: [action] }];
          }
          return { ...prev, permissions: newPerms };
      });
  };

  const handleSave = async (e: React.SyntheticEvent) => {
      e.preventDefault();
      setModalError(null);
      
      // Validation with Feedback
      if (!formData.name) return setModalError("يرجى إدخال الاسم");
      if (!formData.username) return setModalError("يرجى إدخال اسم المستخدم");
      // Password is required for NEW users (id === 0)
      if (!formData.id && !formData.password) return setModalError("يرجى إدخال كلمة المرور للمستخدم الجديد");

      if (currentUser?.role === 'supervisor' && formData.role === 'admin') return setModalError("عفواً، لا يمكنك إنشاء حساب مدير.");

      setIsSaving(true);
      try {
          await saveUser(formData as User);
          setIsModalOpen(false);
          loadData();
      } catch (error: any) {
          console.error(error);
          setModalError(error.message || "حدث خطأ غير معروف");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: number) => {
      if (window.confirm('هل أنت متأكد من الحذف؟')) {
          try {
            await deleteUser(id);
            loadData();
          } catch (error: any) {
            alert("فشل الحذف: " + error.message);
          }
      }
  };

  const isPermitted = (resource: string, action: string) => {
      const p = formData.permissions?.find(x => x.resource === resource);
      return p?.actions.includes(action as any);
  };

  // Determine if checkbox is disabled (Hierarchy Security)
  const isPermissionDisabled = (resource: string, action: string) => {
      if (currentUser?.role === 'admin') return false;
      // Supervisor cannot grant what they don't have
      return !hasPermission(currentUser!, resource, action);
  };

  if (!currentUser) return <div>Access Denied</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
       <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
           <div>
               <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                   <Icons.Users />
                   <span>إدارة الهيكل الوظيفي</span>
               </h2>
           </div>
           <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-xs md:text-sm font-bold">
               <Icons.Plus />
               <span>عضو جديد</span>
           </button>
       </div>

       <div className="overflow-x-auto flex-1">
           <table className="w-full text-right min-w-[600px]">
               <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider sticky top-0 z-10">
                   <tr>
                       <th className="px-6 py-3">الموظف</th>
                       <th className="px-6 py-3">الدور</th>
                       <th className="px-6 py-3">المدير المباشر</th>
                       <th className="px-6 py-3">الحالة</th>
                       <th className="px-6 py-3">تحكم</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                   {loading ? ( <tr><td colSpan={5} className="text-center py-10">...</td></tr> ) : users.map(user => (
                       <tr key={user.id} className="hover:bg-gray-50/50">
                           <td className="px-6 py-4 flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${user.role === 'admin' ? 'bg-black' : user.role === 'supervisor' ? 'bg-purple-600' : 'bg-blue-500'}`}>{user.name.charAt(0)}</div>
                               <div><div className="font-bold text-sm">{user.name}</div><div className="text-xs text-gray-400">@{user.username}</div></div>
                           </td>
                           <td className="px-6 py-4"><span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">{user.role}</span></td>
                           <td className="px-6 py-4 text-xs text-gray-500">{user.supervisorId ? users.find(u => u.id === user.supervisorId)?.name : '-'}</td>
                           <td className="px-6 py-4"><button onClick={() => toggleUserStatus(user.id).then(loadData)} className={`text-[10px] px-2 py-1 rounded font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.isActive ? 'نشط' : 'موقوف'}</button></td>
                           <td className="px-6 py-4 flex gap-2">
                               <button onClick={() => handleOpenModal(user)} className="text-blue-600 bg-blue-50 p-1.5 rounded"><Icons.Edit /></button>
                               {user.id !== currentUser.id && <button onClick={() => handleDelete(user.id)} className="text-red-600 bg-red-50 p-1.5 rounded"><Icons.Trash /></button>}
                           </td>
                       </tr>
                   ))}
               </tbody>
           </table>
       </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">{formData.id ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}</h3>
                <button onClick={() => setIsModalOpen(false)}><Icons.X /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {modalError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                        <Icons.Ban />
                        <div className="text-sm font-bold">{modalError}</div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">الاسم الكامل</label>
                        <input type="text" required placeholder="الاسم" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 block mb-1">البريد الإلكتروني</label>
                         <input type="email" required placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">اسم المستخدم (للدخول)</label>
                        <input type="text" required placeholder="Username" disabled={!!formData.id} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">كلمة المرور</label>
                        <input type="password" placeholder={formData.id ? "اتركها فارغة للتجاهل" : "كلمة المرور"} value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">نوع الحساب</label>
                        <select value={formData.role} onChange={(e) => handleRoleChange(e.target.value)} disabled={currentUser.role === 'delegate'} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                            {currentUser.role === 'admin' && <option value="admin">مدير نظام (Admin)</option>}
                            <option value="supervisor">مشرف (Supervisor)</option>
                            <option value="delegate">مندوب (Delegate)</option>
                        </select>
                    </div>

                    {(formData.role === 'delegate' || formData.role === 'supervisor') && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">المشرف المسؤول</label>
                            <select value={formData.supervisorId || ''} onChange={(e) => setFormData({...formData, supervisorId: Number(e.target.value)})} disabled={currentUser.role === 'supervisor'} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">-- اختر المشرف --</option>
                                {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                
                {/* PERMISSION MATRIX */}
                <div>
                    <h4 className="font-bold text-sm text-gray-500 mb-2 uppercase border-b pb-1">صلاحيات الوصول المتقدمة</h4>
                    <div className="border rounded-xl overflow-hidden text-sm mt-3">
                         <table className="w-full text-center">
                             <thead className="bg-gray-100 text-xs text-gray-600">
                                 <tr><th className="p-2 text-right">القسم</th>{ACTIONS.map(a => <th key={a.id} className="p-2">{a.label}</th>)}</tr>
                             </thead>
                             <tbody>
                                 {RESOURCES.map(res => (
                                     <tr key={res.id} className="border-t border-gray-50 hover:bg-gray-50">
                                         <td className="p-2 text-right font-bold text-gray-700 bg-gray-50/50">{res.label}</td>
                                         {ACTIONS.map(act => {
                                             if (res.id === 'dashboard' && act.id !== 'view') return <td key={act.id}></td>;
                                             const checked = isPermitted(res.id, act.id);
                                             const disabled = isPermissionDisabled(res.id, act.id);
                                             return (
                                                 <td key={act.id} className="p-2 border-l border-gray-50">
                                                     <input 
                                                        type="checkbox" 
                                                        checked={!!checked} 
                                                        disabled={disabled} 
                                                        onChange={() => togglePermission(res.id, act.id)} 
                                                        className="w-5 h-5 accent-blue-600 cursor-pointer disabled:opacity-30 rounded focus:ring-0" 
                                                     />
                                                 </td>
                                             )
                                         })}
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    </div>
                </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition-colors">إلغاء</button>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="px-8 py-2.5 rounded-lg font-bold text-white bg-primary hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    {isSaving && <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>}
                    <span>{isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}</span>
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
