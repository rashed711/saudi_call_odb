import React from 'react';
import { User } from '../types';
import { Icons } from './Icons';

interface ProfileProps {
  user: User;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-24 md:h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
      <div className="px-4 md:px-8 pb-8 relative">
        <div className="absolute -top-10 md:-top-12 right-4 md:right-8">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full p-1 shadow-lg">
                 <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <Icons.User />
                 </div>
            </div>
        </div>
        
        <div className="pt-12 md:pt-16">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-sm md:text-base text-gray-500">@{user.username}</p>
            
            <div className="mt-6 md:mt-8 grid grid-cols-1 gap-4 md:gap-6">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">البريد الإلكتروني</label>
                    <p className="text-gray-900 font-medium text-sm md:text-base break-all">{user.email}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">الصلاحية</label>
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs md:text-sm rounded-full font-bold">
                        {user.role === 'admin' ? 'مدير النظام' : 'مستخدم'}
                    </span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;