import { CampusLandmark } from '../types';

export const KALASALINGAM_CENTER: [number, number] = [9.5764, 77.6782];

export const CAMPUS_LANDMARKS: CampusLandmark[] = [
  {
    name: 'Central Library & Digital Resource Centre',
    category: 'Academic',
    lat: 9.5772,
    lng: 77.6791,
    code: 'LIB-01',
    icon: 'BookOpen',
  },
  {
    name: 'Main Administrative Block & Deanery',
    category: 'Administration',
    lat: 9.5765,
    lng: 77.6780,
    code: 'ADM-01',
    icon: 'Building2',
  },
  {
    name: 'T-Block Engineering & Computing Labs',
    category: 'Academic',
    lat: 9.5758,
    lng: 77.6775,
    code: 'ENG-T',
    icon: 'Cpu',
  },
  {
    name: 'Sir C.V. Raman Science & Research Block',
    category: 'Academic',
    lat: 9.5760,
    lng: 77.6802,
    code: 'SCI-CVR',
    icon: 'FlaskConical',
  },
  {
    name: 'K.S. Krishnan Mechanical Block & Workshops',
    category: 'Academic',
    lat: 9.5752,
    lng: 77.6769,
    code: 'MEC-KSK',
    icon: 'Wrench',
  },
  {
    name: 'Bharathi Boys Hostel Complex (Hostel 1-4)',
    category: 'Hostel',
    lat: 9.5781,
    lng: 77.6765,
    code: 'HST-BOYS',
    icon: 'Home',
  },
  {
    name: 'Mother Teresa Girls Hostel Campus',
    category: 'Hostel',
    lat: 9.5746,
    lng: 77.6795,
    code: 'HST-GIRLS',
    icon: 'Home',
  },
  {
    name: 'University Central Food Court & Canteen',
    category: 'Amenities',
    lat: 9.5775,
    lng: 77.6772,
    code: 'FDC-01',
    icon: 'Utensils',
  },
  {
    name: 'Dr. K. Sridharan Auditorium & Convention Hall',
    category: 'Events',
    lat: 9.5769,
    lng: 77.6808,
    code: 'AUD-01',
    icon: 'Mic',
  },
  {
    name: 'Indoor Sports Complex & Gymnasium',
    category: 'Sports',
    lat: 9.5785,
    lng: 77.6785,
    code: 'SPT-IND',
    icon: 'Trophy',
  },
  {
    name: 'University Health Centre & Pharmacy',
    category: 'Medical',
    lat: 9.5761,
    lng: 77.6788,
    code: 'HLT-01',
    icon: 'HeartPulse',
  },
];

// Calculate Haversine distance in meters
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getNearestLandmark(lat: number, lng: number): { landmark: CampusLandmark; distance: number } {
  let nearest = CAMPUS_LANDMARKS[0];
  let minDistance = Infinity;

  for (const item of CAMPUS_LANDMARKS) {
    const d = getDistanceMeters(lat, lng, item.lat, item.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = item;
    }
  }

  return {
    landmark: nearest,
    distance: Math.round(minDistance),
  };
}

export const SAMPLE_ISSUE_PHOTOS = [
  {
    label: 'Exposed Wires',
    url: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=600&auto=format&fit=crop&q=80',
    category: 'Electrical',
  },
  {
    label: 'Water Pipe Leak',
    url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80',
    category: 'Plumbing',
  },
  {
    label: 'Street Light Out',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    category: 'Electrical',
  },
  {
    label: 'Classroom Furniture Damaged',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&auto=format&fit=crop&q=80',
    category: 'Civil/Safety',
  },
  {
    label: 'Wi-Fi Access Point Malfunction',
    url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80',
    category: 'Wi-Fi/Network',
  },
  {
    label: 'Water Puddle / Washroom Cleanliness',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
    category: 'Cleaning',
  },
];
