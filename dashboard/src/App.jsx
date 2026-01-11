import React, { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import PostureView from './modules/posture/PostureView';

import BehaviorView from './modules/behavior/BehaviorView';
import HealthView from './modules/health/HealthView';
import EnvironmentView from './modules/environment/EnvironmentView';
import OverviewView from './modules/overview/OverviewView';

function App() {
  const [activeFarm, setActiveFarm] = useState('farm1');
  const [activeModule, setActiveModule] = useState('overview'); // Default to Overview
  const [selectedAnimal, setSelectedAnimal] = useState(null); // For Details Panel

  return (
    <div className="min-h-screen bg-[#f0f9ff] text-slate-800 font-sans flex">
      {/* 1. Left Sidebar */}
      <Sidebar activeFarm={activeFarm} onSelectFarm={setActiveFarm} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col ml-20 relative">
        {/* 2. Top Navigation */}
        <TopNav activeModule={activeModule} onSelectModule={setActiveModule} />

        {/* Content Area (Grid for Chart + Details) */}
        <div className="flex-1 pt-[45px] p-6 grid grid-cols-1 lg:grid-cols-4 gap-8 pb-8">

          {/* 3. Main Chart Area (Takes 3 cols) */}
          <div className="lg:col-span-3 flex flex-col h-[650px] mt-4 overflow-hidden rounded-3xl shadow-pop bg-white border border-slate-100 relative z-10">
            {activeModule === 'posture' && (
              <PostureView isActive={true} onSelectData={(data) => setSelectedAnimal(data)} />
            )}
            {activeModule === 'behavior' && <BehaviorView selectedCow={selectedAnimal?.id} onSelectCow={(id) => setSelectedAnimal({ id })} />}
            {activeModule === 'health' && <HealthView selectedCow={selectedAnimal?.id} onSelectCow={(id) => setSelectedAnimal({ id })} />}
            {activeModule === 'env' && <EnvironmentView selectedCow={selectedAnimal?.id} onSelectCow={(id) => setSelectedAnimal({ id })} />}
            {activeModule === 'overview' && <OverviewView />}

            {!['posture', 'behavior', 'health', 'env', 'overview'].includes(activeModule) && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-500">
                  <span className="text-4xl">🚧</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-700 mb-2">Coming Soon</h2>
                <p className="text-slate-400">The {activeModule} module is in development.</p>
              </div>
            )}
          </div>

          {/* 4. Details Panel (Takes 1 col) */}
          <div className="lg:col-span-1 h-[650px] mt-4">
            <DetailsPanel data={selectedAnimal} />
          </div>

        </div>
      </div>
    </div>
  );
}



import { useCowData } from './hooks/useCowData';

// Static Metadata for the 5 Cows
const COW_METADATA = {
  'COW_01': { age: 4, breed: 'Holstein', color: 'Black/White', img: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?q=80&w=2070&auto=format&fit=crop' },
  'COW_02': { age: 3, breed: 'Jersey', color: 'Brown', img: 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?q=80&w=1921&auto=format&fit=crop' },
  'COW_03': { age: 5, breed: 'Holstein', color: 'Spotted', img: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?q=80&w=2000&auto=format&fit=crop' },
  'COW_04': { age: 2, breed: 'Guernsey', color: 'Red/White', img: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2074&auto=format&fit=crop' },
  'COW_05': { age: 6, breed: 'Holstein', color: 'Black', img: 'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?q=80&w=2070&auto=format&fit=crop' }
};

function DetailsPanel({ data }) {
  const { data: allData } = useCowData();

  // Determine Mode: Legacy (Posture) vs New (Behavior/Health)
  // Legacy passes full object with breed/age/etc. New passes { id: 'COW_XX' } or null.
  const isLegacyData = data && data.breed;

  // 1. Determine ID
  const id = data?.id || "COW_01";

  // 2. Get Metadata & Status
  let displayData = {};

  if (isLegacyData) {
    // --- LEGACY MODE (Posture View - 10 Animals) ---
    displayData = {
      id: id,
      age: data.age ? `${data.age} yrs` : 'Unknown',
      breed: data.breed || 'Unknown',
      color: data.color || 'Unknown',
      img: data.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      status: data.stats?.eating < 10 ? "Attention" : "Healthy",
      lastEvent: "Live Stream",
      isSick: false // Legacy data doesn't have sick status in the same way
    };
  } else {
    // --- NEW MODE (5 Cows CSV) ---
    const meta = COW_METADATA[id] || COW_METADATA['COW_01'];

    // Get Latest Dynamic Data from CSV
    let latestRow = null;
    if (allData && allData.length > 0) {
      const cowRows = allData.filter(r => r.cow_id === id);
      cowRows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      latestRow = cowRows[0];
    }

    displayData = {
      id: id,
      age: `${meta.age} years`,
      breed: meta.breed,
      color: meta.color,
      img: meta.img,
      status: latestRow?.health_status || "Unknown",
      lastEvent: latestRow ? new Date(latestRow.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Loading...",
      isSick: (latestRow?.health_status || "").toLowerCase().includes('sick')
    };
  }

  return (
    <div className="h-full p-6 flex flex-col animate-slide-in-right glass-card shadow-pop relative overflow-hidden">
      {/* Glass Reflection */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 drop-shadow-sm">
          <span className="w-1 h-5 bg-blue-600 rounded-full shadow-glow"></span>
          Animal Details
        </h3>
        <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-blue-600 font-bold shadow-sm">
          <span className="text-xs">ID</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col overflow-y-auto no-scrollbar pr-1">
        {/* Animal Image & Basic Info */}
        <div className="flex gap-4 items-start mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-white/80 shrink-0">
            <img src={displayData.img} alt="Cow" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs text-slate-500 font-medium">ID: {displayData.id}</p>
            <h4 className="text-lg font-bold text-slate-900 leading-tight">{displayData.breed}</h4>
            <div className="flex gap-2 mt-1">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md">
                Lactating
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">
                {displayData.age}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 bg-white/50 p-3 rounded-xl border border-white/60 shadow-sm mb-4">
          <DetailItem label="Color" value={displayData.color} />
          <DetailItem
            label="Current Status"
            value={displayData.status}
            highlight={true}
            statusType={displayData.isSick ? 'Attention' : 'Healthy'}
          />
          <DetailItem label="Last Event" value={displayData.lastEvent} />
          <DetailItem label="Group" value="Herd B" />
        </div>

        <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md transition-all active:scale-95 mb-4">
          View Full Profile
        </button>

        <div className={`p-3 rounded-xl border shadow-sm mb-4 ${displayData.isSick ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
          <div className="flex justify-between items-center mb-1">
            <h4 className={`text-xs font-bold flex items-center gap-2 ${displayData.isSick ? 'text-orange-800' : 'text-green-800'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${displayData.isSick ? 'bg-orange-500' : 'bg-green-500'}`}></span>
              {displayData.isSick ? 'Attention Needed' : 'Status: Normal'}
            </h4>
            <span className={`text-[10px] ${displayData.isSick ? 'text-orange-600' : 'text-green-600'}`}>Just now</span>
          </div>
          <p className={`text-[10px] leading-relaxed font-medium ${displayData.isSick ? 'text-orange-700' : 'text-green-700'}`}>
            {displayData.isSick
              ? `Health Alert: ${displayData.status}`
              : "Normal behavior observed."}
          </p>

          {/* Add Task Input - Restored */}
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Add task..."
              className="flex-1 bg-white/80 border border-slate-200 rounded-md px-2 py-1 text-[10px] focus:outline-none focus:border-blue-400 text-slate-700"
            />
            <button className="p-1 bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
              <span className="text-xs font-bold">+</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <TaskItem label={`Check ${displayData.id}`} date="Today" />
          <TaskItem label="Administer Medication" date="Personal" />
        </div>

      </div>
    </div>
  );
}

function DetailItem({ label, value, highlight, statusType }) {
  let valueClass = "font-semibold text-xs text-slate-800";

  if (highlight) {
    if (statusType === 'Attention') {
      valueClass = "font-bold text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-200";
    } else {
      valueClass = "font-bold text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-md border border-green-200";
    }
  }

  return (
    <div className="flex justify-between items-center pb-1 border-b border-slate-200/50 last:border-0 last:pb-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className={valueClass}>
        {value}
      </span>
    </div>
  );
}

function TaskItem({ label, date }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/30 rounded-xl border border-white/40 hover:bg-white/60 transition-all cursor-pointer shadow-sm hover:shadow-md">
      <div className="w-5 h-5 rounded-md border-2 border-slate-400/50 flex items-center justify-center"></div>
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-[10px] text-slate-500">{date}</p>
      </div>
    </div>
  )
}


export default App;
