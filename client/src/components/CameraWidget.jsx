import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { Camera, Maximize2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from './UI';

export default function CameraWidget({ cameras = [] }) {
  const navigate = useNavigate();
  const [expandedCamera, setExpandedCamera] = useState(null);

  if (!cameras || cameras.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary-500" />
            المراقبة الحية
          </h3>
          <button 
            onClick={() => navigate('/cameras')} 
            className="text-sm text-primary-500 hover:underline flex items-center gap-1"
          >
            إدارة الكاميرات
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="text-center py-8 text-gray-400">
          <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">لم يتم إضافة كاميرات بعد</p>
          <button 
            onClick={() => navigate('/cameras')} 
            className="mt-3 text-primary-500 text-sm hover:underline"
          >
            إضافة كاميرا الآن
          </button>
        </div>
      </Card>
    );
  }

  // Show first 4 cameras max on dashboard
  const displayCameras = cameras.slice(0, 4);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary-500" />
          المراقبة الحية
          {cameras.length > 4 && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
              +{cameras.length - 4}
            </span>
          )}
        </h3>
        <button 
          onClick={() => navigate('/cameras')} 
          className="text-sm text-primary-500 hover:underline flex items-center gap-1"
        >
          عرض الكل
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {displayCameras.map((cam) => (
          <div key={cam._id} className="relative group rounded-lg overflow-hidden bg-black aspect-video">
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
                playing
                muted
                volume={0}
                controls={false}
              />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="text-white text-xs font-bold truncate">{cam.name}</span>
                <button 
                  onClick={() => navigate('/cameras')}
                  className="p-1 bg-white/20 hover:bg-white/30 rounded text-white"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Live Badge */}
            <div className="absolute top-2 left-2">
              <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse font-bold">
                LIVE
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
