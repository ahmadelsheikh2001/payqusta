import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Camera, Plus, Trash2, Edit, Save, ExternalLink, RefreshCw, X, Video } from 'lucide-react';
import { Button, Input, Card, Modal, EmptyState } from '../components/UI';
import toast from 'react-hot-toast';
import { api } from '../store';

export default function CamerasPage() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', type: 'stream' });
  const [playing, setPlaying] = useState(true);

  // Load cameras (stored in Tenant settings)
  // For now, we assume an API endpoint updates the current tenant's cameras
  // Since we don't have a dedicated /cameras endpoint yet, we might use /settings/store or similar
  // OR we create a new endpoint. 
  // Let's assume we fetch 'current tenant' via /auth/me or a dedicated /tenants/cameras endpoint.
  // For simplicity MVP, I'll allow "local storage" simulation if backend isn't ready, OR 
  // better: Update Tenant via /admin/tenants if admin, or /settings/store if vendor.
  // Actually, let's fetch from /auth/me -> tenant -> cameras.
  
  const fetchCameras = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/me'); // Get user + tenant
      setCameras(res.data.data.tenant.cameras || []);
    } catch (err) {
      console.error(err);
      toast.error('فشل تحميل الكاميرات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.url) return toast.error('الاسم والرابط مطلوبين');
    
    try {
      // We need to update the FULL tenant object or just cameras.
      // Since we modified Tenant model, we need an endpoint to update it.
      // We can use PUT /settings/store if we update backend to handle 'cameras'.
      // Let's assume we'll update the backend controller to allow 'cameras' in updates.
      // For now, let's optimistic update.
      
      const newCameras = editingId 
        ? cameras.map(c => c._id === editingId ? { ...c, ...form } : c)
        : [...cameras, { ...form, _id: Date.now().toString() }]; // Temp ID
      
      // Send update to backend
      // Warning: We need to ensure the backend accepts this.
      // I'll send to /settings/store assuming it accepts arbitrary fields or I'll implement it.
      await api.put('/settings/store', { cameras: newCameras });
      
      setCameras(newCameras);
      toast.success(editingId ? 'تم تعديل الكاميرا' : 'تم إضافة الكاميرا');
      setShowModal(false);
      setForm({ name: '', url: '', type: 'stream' });
      setEditingId(null);
    } catch (err) {
      toast.error('حدث خطأ في الحفظ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      const newCameras = cameras.filter(c => c._id !== id);
      await api.put('/settings/store', { cameras: newCameras });
      setCameras(newCameras);
      toast.success('تم الحذف');
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="w-8 h-8 text-primary-500" />
            المراقبة الحية (CCTV)
          </h1>
          <p className="text-gray-500">متابعة الفروع والكاشير مباشرة</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditingId(null); setForm({ name: '', url: '', type: 'stream' }); setShowModal(true); }}>
          إضافة كاميرا
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">Loading...</div>
      ) : cameras.length === 0 ? (
        <EmptyState 
          icon={<Video className="w-12 h-12" />} 
          title="لا توجد كاميرات مضافة" 
          description="أضف روابط الكاميرات لمتابعة العمل مباشرة" 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cameras.map((cam) => (
            <Card key={cam._id} className="overflow-hidden group">
              <div className="aspect-video bg-black relative">
                {cam.type === 'embed' ? (
                  <iframe 
                    src={cam.url} 
                    className="w-full h-full border-0" 
                    allow="autoplay; encrypted-media" 
                    allowFullScreen
                  />
                ) : (
                  <ReactPlayer
                    url={cam.url}
                    width="100%"
                    height="100%"
                    playing={playing}
                    controls
                    volume={0} // Muted by default for auto play
                  />
                )}
                
                {/* Overlay actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(cam._id); setForm(cam); setShowModal(true); }} className="p-1.5 bg-black/50 text-white rounded hover:bg-black/70">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(cam._id)} className="p-1.5 bg-red-500/80 text-white rounded hover:bg-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="absolute top-2 left-2">
                  <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                </div>
              </div>
              <div className="p-3 border-t dark:border-gray-800">
                <h3 className="font-bold text-sm">{cam.name}</h3>
                <p className="text-xs text-gray-500 truncate" title={cam.url}>{cam.url}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'تعديل كاميرا' : 'إضافة كاميرا جديدة'} size="sm">
        <div className="space-y-4">
          <Input label="اسم الكاميرا / الفرع" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="مثال: الكاشير - فرع القاهرة" />
          
          <div>
            <label className="block text-sm font-bold mb-1">نوع الرابط</label>
            <div className="flex gap-2">
              <button 
                className={`flex-1 py-2 rounded-lg border-2 ${form.type === 'stream' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'}`}
                onClick={() => setForm({...form, type: 'stream'})}
              >
                مباشر (HLS/MP4)
              </button>
              <button 
                className={`flex-1 py-2 rounded-lg border-2 ${form.type === 'embed' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'}`}
                onClick={() => setForm({...form, type: 'embed'})}
              >
                تضمين (Embed)
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">استخدم "مباشر" لروابط .m3u8 أو .mp4، واستخدم "تضمين" لروابط YouTube Live أو المشغلات الخارجية.</p>
          </div>

          <Input label="رابط البث (URL)" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." dir="ltr" />
          
          <div className="flex justify-end gap-2 mt-4">
             <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
             <Button onClick={handleSave}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
