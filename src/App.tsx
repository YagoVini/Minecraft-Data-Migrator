/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Download, RefreshCw, Box, User, Terminal, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { parseNBT, transferData, PlayerData } from './lib/nbtUtils';
import { cn } from './lib/utils';

export default function App() {
  const [donor, setDonor] = useState<PlayerData | null>(null);
  const [target, setTarget] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [options, setOptions] = useState({
    inventory: true,
    enderItems: true,
    xp: true,
    stats: true,
    uuid: true,
    mods: true,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'donor' | 'target') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const data = await parseNBT(file);
      if (type === 'donor') setDonor(data);
      else setTarget(data);
    } catch (err) {
      console.error(err);
      setError(`Erro ao ler arquivo ${type === 'donor' ? 'doador' : 'alvo'}. Verifique se é um arquivo .dat válido.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!donor || !target) return;

    setLoading(true);
    setError(null);
    try {
      const buffer = await transferData(donor, target, options);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = target.uuid ? `${target.uuid}.dat` : `updated_player.dat`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro durante a transferência dos dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="mc-container w-full max-w-[960px] min-h-[700px] p-6 flex flex-col gap-5">
        <header className="text-center border-b-4 border-[#373737] pb-4">
          <h1 className="text-3xl font-black uppercase text-white drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            Player Data NBT Modifier v1.0
          </h1>
          <p className="text-sm opacity-80 mt-1">Migration Tool for UUID and Inventory Management</p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr] gap-5 flex-1">
          {/* DONOR CARD */}
          <PlayerCard 
            title="Donor: Pre-Migration" 
            data={donor} 
            onUpload={(e) => handleFileUpload(e, 'donor')}
          />

          {/* CENTER ACTIONS */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-2xl drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] hidden md:block">➡</div>
            
            <div className="w-full space-y-2 bg-black/20 p-3 border border-[#333]">
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input type="checkbox" checked={options.inventory} onChange={e => setOptions({...options, inventory: e.target.checked})} className="mc-checkbox" />
                INV. PRINCIPAL
              </label>
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input type="checkbox" checked={options.enderItems} onChange={e => setOptions({...options, enderItems: e.target.checked})} className="mc-checkbox" />
                INV. ENDER
              </label>
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input type="checkbox" checked={options.xp} onChange={e => setOptions({...options, xp: e.target.checked})} className="mc-checkbox" />
                EXP / NÍVEL
              </label>
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input type="checkbox" checked={options.stats} onChange={e => setOptions({...options, stats: e.target.checked})} className="mc-checkbox" />
                SAÚDE / FOME
              </label>
              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                <input type="checkbox" checked={options.uuid} onChange={e => setOptions({...options, uuid: e.target.checked})} className="mc-checkbox" />
                SUBSTITUIR UUID
              </label>
              <label className="flex items-center gap-2 text-[10px] cursor-pointer text-[#FFAA00]">
                <input type="checkbox" checked={options.mods} onChange={e => setOptions({...options, mods: e.target.checked})} className="mc-checkbox" />
                SINCRONIZAR MODS
              </label>
            </div>

            <button 
              onClick={handleSwap}
              disabled={!donor || !target || loading}
              className="mc-button primary w-full flex flex-col items-center gap-2"
            >
              {loading ? <RefreshCw className="animate-spin" /> : 'Realizar Transferência'}
            </button>
            <div className="text-center text-[8px] opacity-60">
              Backup seus mundos antes de prosseguir
            </div>
            {success && (
              <div className="text-[#55FF55] text-xs text-center animate-bounce">
                ✓ SUCESSO!
              </div>
            )}
          </div>

          {/* TARGET CARD */}
          <PlayerCard 
            title="Target: ActiveAccount" 
            data={target} 
            onUpload={(e) => handleFileUpload(e, 'target')}
          />
        </main>

        <footer className="mc-footer flex justify-between items-center bg-[#373737] p-2 px-4 border-2 border-black text-xs">
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", success ? "bg-green-500" : "bg-blue-500")} />
            {loading ? 'PROCESSANDO...' : 'SISTEMA ONLINE'}
          </div>
          <div>NBT ENGINE: PRISMARINE_WEB</div>
        </footer>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="fixed bottom-10 mc-panel border-red-600 bg-red-900/80 text-white max-w-md shadow-2xl z-50 p-4"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerCard({ title, data, onUpload }: { 
  title: string, 
  data: PlayerData | null, 
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mc-card p-4 flex flex-col gap-3 min-h-[400px]">
      <h2 className="text-lg uppercase text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] border-b-2 border-[#373737] pb-2">
        {title}
      </h2>

      <div className="h-44 bg-[#555] border-4 border-black relative flex flex-col items-center justify-center overflow-hidden">
        {data ? (
          <>
            <img 
              src={`https://crafatar.com/renders/body/${data.uuid}?scale=4`} 
              className="h-32 rendering-pixelated mb-1"
              alt="Skin"
              referrerPolicy="no-referrer"
            />
            <div className="bg-black/60 px-2 py-0.5 text-xs text-[#55FF55] border border-[#333]">
              {data.name}
            </div>
            <div className="absolute bottom-1 right-1 opacity-40 text-[8px] break-all max-w-[90%] text-right font-mono">
              {data.uuid}
            </div>
          </>
        ) : (
          <User className="w-16 h-16 text-[#444]" />
        )}
      </div>

      <div className="mc-panel flex-1 text-[10px] overflow-y-auto scrollbar-mine p-2">
        {data ? (
          <div className="space-y-4">
             {/* Armor & Offhand Row */}
             <div className="flex gap-4 border-b border-[#333] pb-2">
                <div className="flex flex-col gap-1">
                  <div className="text-[7px] opacity-40 uppercase">Armadura</div>
                  <div className="flex gap-1">
                    {[3, 2, 1, 0].map(i => (
                      <div key={i} className="mc-slot w-7 h-7">
                        {data.armor[i] && (
                          <div className="relative group w-full h-full flex items-center justify-center">
                            <Box className="w-3.5 h-3.5 text-[#444]" />
                            <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <div className="bg-black text-[#55FF55] text-[8px] p-1 absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 border border-[#333]">
                                {data.armor[i].id?.value?.split(':').pop()?.toUpperCase() || 'UNKNOWN'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className="text-[7px] opacity-40 uppercase">Mão Sec.</div>
                  <div className="mc-slot w-7 h-7">
                    {data.offhand && (
                      <div className="relative group w-full h-full flex items-center justify-center">
                        <Box className="w-3.5 h-3.5 text-[#444]" />
                        <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-black text-[#55FF55] text-[8px] p-1 absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 border border-[#333]">
                            {data.offhand.id?.value?.split(':').pop()?.toUpperCase() || 'UNKNOWN'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
             </div>

             {/* Main Inventory Grid */}
             <div>
                <div className="text-[7px] opacity-40 uppercase mb-1">Inventário Principal</div>
                <div className="grid grid-cols-9 gap-1">
                  {data.inventory.map((item, i) => (
                    <div key={i} className="mc-slot">
                      {item && (
                        <div className="relative group w-full h-full flex items-center justify-center">
                          <Box className="w-4 h-4 text-[#444]" />
                          <span className="absolute bottom-0 right-0 text-[8px] text-white drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] bg-black/40 px-0.5">
                            {item.Count.value}
                          </span>
                          <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black text-[#55FF55] text-[8px] p-1 absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 border border-[#333]">
                              {item.id?.value?.split(':').pop()?.toUpperCase() || 'UNKNOWN'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
             </div>

            <div className="grid grid-cols-2 gap-x-2 border-t border-[#333] pt-2">
              <div>XP Nível: {data.xpLevel}</div>
              <div>Vida: {Math.round(data.health)}/20</div>
              <div>Fome: {data.foodLevel}/20</div>
              <div className="col-span-2 mt-1 italic opacity-40">
                XP Total: {data.xpTotal}
              </div>
            </div>

            {data.modTags.length > 0 && (
              <div className="mt-1 py-1 border-t border-[#333]">
                <div className="text-[7px] text-[#FFAA00] font-bold uppercase mb-1">Mods Detectados:</div>
                <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto scrollbar-mine">
                  {data.modTags.map(tag => (
                    <span key={tag} className="bg-black/40 px-1 rounded-[2px] text-[7px] border border-[#444]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
             <p className="opacity-40 italic">Carregue um arquivo para ver os detalhes</p>
          </div>
        )}
      </div>

      <button 
        onClick={() => fileInputRef.current?.click()}
        className="mc-button w-full"
      >
        {data ? 'Trocar Arquivo' : 'Carregar .dat'}
      </button>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onUpload} 
        className="hidden" 
        accept=".dat"
      />
    </div>
  );
}

function StatBox({ label, value }: { label: string, value: any }) {
  return (
    <div className="bg-black/30 p-1 border border-[#333] text-center">
      <p className="text-[10px] text-[#666] leading-none mb-1">{label}</p>
      <p className="text-sm text-[#FFD700]">{value}</p>
    </div>
  );
}
