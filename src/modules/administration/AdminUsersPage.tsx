import React, { useCallback, useEffect, useState } from 'react';
import { Search, Shield } from 'lucide-react';
import {
  assignUserRolesAdmin,
  listUserRolesMapAdmin,
  listUsersForAdmin,
  toggleUserSuspensionRpc,
} from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { ACCOUNT_TYPE_LABELS, formatChileDate } from '../../utils/formatters';
import type { Profile, UserRole } from '../../types/domain';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'Usuario' },
  { value: 'moderator', label: 'Moderador' },
  { value: 'admin', label: 'Administrador' },
  { value: 'super_admin', label: 'Superadministrador' },
];

export const AdminUsersPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [rolesMap, setRolesMap] = useState<Map<string, UserRole[]>>(new Map());
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, rMap] = await Promise.all([
        listUsersForAdmin(search),
        listUserRolesMapAdmin(),
      ]);
      setUsers(data);
      setRolesMap(rMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando usuarios.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const handleToggle = async (u: Profile) => {
    setError(null);
    try {
      await toggleUserSuspensionRpc(
        u.id,
        !u.is_suspended,
        reasons[u.id] || (u.is_suspended ? 'Reactivación administrativa' : 'Suspensión preventiva')
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No tienes permisos para suspender cuentas.');
    }
  };

  const handleRoleChange = async (userId: string, highestRole: UserRole) => {
    setError(null);
    const nextRoles: UserRole[] =
      highestRole === 'super_admin'
        ? ['user', 'moderator', 'admin', 'super_admin']
        : highestRole === 'admin'
          ? ['user', 'moderator', 'admin']
          : highestRole === 'moderator'
            ? ['user', 'moderator']
            : ['user'];
    try {
      await assignUserRolesAdmin(userId, nextRoles);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No autorizado para asignar roles.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Gestión de usuarios</h1>
          <p className="text-sm text-slate-300">
            Consulta cuentas registradas, supervisa suspensiones y gestiona roles administrativos autorizados.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre o usuario..."
            className="w-full rounded-xl border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 pl-9 pr-3 py-2 text-xs focus:border-[#FFA94D] focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/70 border border-red-400/40 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-2xl bg-[#102C49] border border-[#244B73] animate-pulse" />
      ) : (
        <div className="rounded-2xl bg-[#102C49] border border-[#244B73] overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#244B73] text-slate-300">
                <th className="py-3 px-4 font-semibold">Usuario</th>
                <th className="py-3 px-4 font-semibold">Tipo</th>
                <th className="py-3 px-4 font-semibold">Comuna</th>
                <th className="py-3 px-4 font-semibold">Rol RBAC</th>
                <th className="py-3 px-4 font-semibold">Reputación</th>
                <th className="py-3 px-4 font-semibold">Registro</th>
                <th className="py-3 px-4 font-semibold">Estado</th>
                <th className="py-3 px-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#244B73] text-slate-200">
              {users.map((u) => {
                const userRoles = rolesMap.get(u.id) || ['user'];
                const currentHighest: UserRole = userRoles.includes('super_admin')
                  ? 'super_admin'
                  : userRoles.includes('admin')
                    ? 'admin'
                    : userRoles.includes('moderator')
                      ? 'moderator'
                      : 'user';

                return (
                  <tr key={u.id} className="hover:bg-[#163B61]/60">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{u.full_name}</div>
                      <div className="text-slate-300">@{u.username}</div>
                    </td>
                    <td className="py-3 px-4">{ACCOUNT_TYPE_LABELS[u.account_type]}</td>
                    <td className="py-3 px-4">{u.communes?.name || '—'}</td>
                    <td className="py-3 px-4">
                      {isSuperAdmin ? (
                        <select
                          value={currentHighest}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="rounded-lg border border-[#2D557F] bg-[#0B1E33] px-2 py-1 text-xs font-medium text-white focus:border-[#FFA94D] focus:outline-none"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-200">
                          <Shield className="h-3.5 w-3.5 text-[#FFA94D]" />
                          {ROLE_OPTIONS.find((r) => r.value === currentHighest)?.label}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      {Number(u.reputation_avg).toFixed(1)} ({u.reputation_count})
                    </td>
                    <td className="py-3 px-4">{formatChileDate(u.created_at)}</td>
                    <td className="py-3 px-4">
                      <span className={u.is_suspended ? 'text-red-300 font-semibold' : 'text-[#6EE7B7] font-semibold'}>
                        {u.is_suspended ? 'Suspendida' : 'Activa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <input
                        type="text"
                        value={reasons[u.id] ?? ''}
                        onChange={(e) => setReasons((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        placeholder="Motivo..."
                        className="rounded-lg border border-[#2D557F] bg-[#0B1E33] text-white placeholder:text-slate-400 px-2 py-1 text-xs w-36 focus:border-[#FFA94D] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleToggle(u)}
                        className={`px-3 py-1.5 rounded-lg font-semibold ${
                          u.is_suspended
                            ? 'bg-[#1E7E48] text-white hover:bg-[#239454]'
                            : 'border border-red-400/50 bg-red-950/50 text-red-200 hover:bg-red-900/60'
                        }`}
                      >
                        {u.is_suspended ? 'Reactivar' : 'Suspender'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
