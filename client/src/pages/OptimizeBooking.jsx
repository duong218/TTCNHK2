import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { assets } from '../assets/assets';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import StarRating from '../components/StarRating';

const OptimizeBooking = () => {
    const { axios, currency, facilityIcons } = useAppContext();
    const navigate = useNavigate();

    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [checkInDate, setCheckInDate] = useState('');
    const [checkOutDate, setCheckOutDate] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState(null);
    const [solutions, setSolutions] = useState(null);

    const handleOptimize = async (e) => {
        e.preventDefault();
        
        if (!checkInDate || !checkOutDate) {
            toast.error('Vui lòng chọn ngày nhận phòng và ngày trả phòng');
            return;
        }

        if (checkInDate >= checkOutDate) {
            toast.error('Ngày trả phòng phải sau ngày nhận phòng');
            return;
        }

        if (adults < 1) {
            toast.error('Cần ít nhất 1 người lớn');
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post('/api/bookings/optimize', {
                adults,
                children,
                checkInDate,
                checkOutDate,
                city: city || undefined
            });

            if (data.success) {
                if (data.solutions) {
                    // Tour group solutions
                    setSolutions(data.solutions);
                    setRecommendations(null);
                    toast.success(data.message || `Found ${data.solutions.length} optimal solutions`);
                } else if (data.recommendations) {
                    // Individual room recommendations
                    setRecommendations(data.recommendations);
                    setSolutions(null);
                    toast.success(`Found ${data.recommendations.length} suitable rooms`);
                }
            } else {
                toast.error(data.message || 'Failed to optimize booking');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Failed to optimize booking');
        } finally {
            setLoading(false);
        }
    };

    const handleBookRoom = (roomId) => {
        navigate(`/rooms/${roomId}?checkIn=${checkInDate}&checkOut=${checkOutDate}&adults=${adults}&children=${children}`);
    };

    return (
        <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
            <div className='max-w-6xl mx-auto'>
                <h1 className='text-3xl md:text-4xl font-playfair mb-2'>Tối ưu hóa đặt phòng của bạn</h1>
                <p className='text-gray-500 mb-8'>Tìm các lựa chọn phòng tốt nhất cho nhóm của bạn, bao gồm cả nhóm du lịch</p>

                {/* Search Form */}
                <form onSubmit={handleOptimize} className='bg-white shadow-lg rounded-xl p-6 mb-8'>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Người lớn</label>
                            <input
                                type='number'
                                min='1'
                                value={adults}
                                onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                                className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-primary'
                                required
                            />
                        </div>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Trẻ nhỏ</label>
                            <input
                                type='number'
                                min='0'
                                value={children}
                                onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                                className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-primary'
                            />
                        </div>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Nhận phòng</label>
                            <input
                                type='date'
                                min={new Date().toISOString().split('T')[0]}
                                value={checkInDate}
                                onChange={(e) => setCheckInDate(e.target.value)}
                                className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-primary'
                                required
                            />
                        </div>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Trả phòng</label>
                            <input
                                type='date'
                                min={checkInDate || new Date().toISOString().split('T')[0]}
                                value={checkOutDate}
                                onChange={(e) => setCheckOutDate(e.target.value)}
                                disabled={!checkInDate}
                                className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-primary disabled:bg-gray-100'
                                required
                            />
                        </div>
                    </div>
                    <div className='mt-4'>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Thành phố (Không bắt buộc)</label>
                        <input
                            type='text'
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder='Lọc theo thành phố'
                            className='w-full max-w-md rounded border border-gray-300 px-3 py-2 outline-none focus:border-primary'
                        />
                    </div>
                    <button
                        type='submit'
                        disabled={loading}
                        className='mt-6 bg-primary hover:bg-primary-dull text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                        {loading ? 'Đang tìm kiếm...' : 'Tìm phòng tối ưu'}
                    </button>
                </form>

                {/* Giải pháp cho nhóm du lịch */}
                {solutions && solutions.length > 0 && (
                    <div className='mb-8'>
                        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6'>
                            <h2 className='text-2xl font-playfair mb-2'>Đặt tour theo nhóm - {adults + children} khách</h2>
                            <p className='text-gray-600'>Hệ thống đã tìm thấy {solutions.length} phương án tối ưu để sắp xếp phòng cho nhóm của bạn. Các phương án được sắp xếp theo giá tốt nhất và số phòng ít nhất.</p>
                        </div>
                        {solutions.map((solution, index) => (
                            <div key={index} className='bg-white shadow-lg rounded-xl p-6 mb-4 border-2 border-transparent hover:border-primary transition-all'>
                                <div className='flex flex-col md:flex-row justify-between items-start mb-4 pb-4 border-b border-gray-200'>
                                    <div className='mb-4 md:mb-0'>
                                        <div className='flex items-center gap-3 mb-2'>
                                            <h3 className='text-xl font-semibold'>Phương án {index + 1}</h3>
                                            {index === 0 && (
                                                <span className='px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold'>
                                                    Tốt nhất
                                                </span>
                                            )}
                                        </div>
                                        <div className='flex flex-wrap gap-4 text-sm text-gray-600'>
                                            <span>📦 {solution.totalRooms} phòng</span>
                                            <span>🌙 {solution.nights} đêm</span>
                                            <span>👥 {adults + children} khách</span>
                                        </div>
                                    </div>
                                    <div className='text-left md:text-right'>
                                        <p className='text-3xl font-bold text-primary mb-1'>{currency}{solution.totalPrice.toFixed(2)}</p>
                                        <p className='text-sm text-gray-500 mb-2'>Tổng cộng</p>
                                        <p className='text-lg font-semibold text-gray-700'>{currency}{solution.pricePerPerson.toFixed(2)}</p>
                                        <p className='text-xs text-gray-500'>/ người</p>
                                    </div>
                                </div>
                                <div className='mb-4'>
                                    <h4 className='font-semibold text-gray-700 mb-3'>Chi tiết các phòng:</h4>
                                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                                        {solution.rooms.map((roomDetail, roomIndex) => (
                                            <div key={roomIndex} className='border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow'>
                                                <img
                                                    src={roomDetail.room.images?.[0] || assets.heroImage}
                                                    alt={roomDetail.room.roomType}
                                                    className='w-full h-32 object-cover rounded mb-2'
                                                />
                                                <h4 className='font-semibold text-gray-800'>{roomDetail.room.roomType}</h4>
                                                <p className='text-sm text-gray-600 mb-2'>{roomDetail.room.hotel.name}</p>
                                                <div className='flex items-center gap-2 text-sm text-gray-500 mb-2'>
                                                    <span>👤 {roomDetail.adults} người lớn</span>
                                                    {roomDetail.children > 0 && (
                                                        <span>👶 {roomDetail.children} trẻ em</span>
                                                    )}
                                                </div>
                                                <p className='text-primary font-semibold'>{currency}{roomDetail.price.toFixed(2)}</p>
                                                <button
                                                    onClick={() => handleBookRoom(roomDetail.room._id)}
                                                    className='mt-2 w-full bg-primary hover:bg-primary-dull text-white px-4 py-2 rounded text-sm font-semibold transition-all'
                                                >
                                                    Xem chi tiết
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Individual Room Recommendations */}
                {recommendations && recommendations.length > 0 && (
                    <div>
                        <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-6'>
                            <h2 className='text-2xl font-playfair mb-2'>Danh sách phòng phù hợp</h2>
                            <p className='text-gray-600'>Hệ thống đã tìm thấy {recommendations.length} phòng phù hợp cho {adults + children} khách. Các phòng được sắp xếp theo giá tốt nhất.</p>
                        </div>
                        <div className='space-y-6'>
                            {recommendations.map((rec, index) => (
                                <div key={index} className='bg-white shadow-lg rounded-xl overflow-hidden'>
                                    <div className='flex flex-col md:flex-row'>
                                        <img
                                            src={rec.room.images?.[0] || assets.heroImage}
                                            alt={rec.room.roomType}
                                            className='md:w-64 h-48 md:h-auto object-cover cursor-pointer'
                                            onClick={() => handleBookRoom(rec.room._id)}
                                        />
                                        <div className='flex-1 p-6'>
                                            <div className='flex justify-between items-start mb-2'>
                                                <div>
                                                    <h3 className='text-2xl font-playfair'>{rec.room.hotel.name}</h3>
                                                    <p className='text-gray-500'>{rec.room.roomType}</p>
                                                </div>
                                                <div className='text-right'>
                                                    <p className='text-2xl font-bold text-primary'>{currency}{rec.totalPrice.toFixed(2)}</p>
                                                    <p className='text-sm text-gray-500'>{currency}{rec.pricePerPerson.toFixed(2)} per person</p>
                                                </div>
                                            </div>
                                            <div className='flex items-center gap-1 text-gray-500 mb-3'>
                                                <img src={assets.locationIcon} alt='location' className='w-4 h-4' />
                                                <span className='text-sm'>{rec.room.hotel.address}</span>
                                            </div>
                                            <div className='flex flex-wrap gap-2 mb-3'>
                                                {rec.room.amenities?.slice(0, 3).map((amenity, idx) => (
                                                    <div key={idx} className='flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs'>
                                                        <img src={facilityIcons[amenity]} alt={amenity} className='w-4 h-4' />
                                                        <span>{amenity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <div>
                                                    <p className='text-sm text-gray-600'>
                                                        Capacity: {rec.adults} adult(s), {rec.children} child(ren)
                                                    </p>
                                                    <p className='text-sm text-gray-600'>{rec.nights} night(s)</p>
                                                    {rec.isAvailable ? (
                                                        <span className='inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs'>
                                                            Available
                                                        </span>
                                                    ) : (
                                                        <span className='inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs'>
                                                            Not Available
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleBookRoom(rec.room._id)}
                                                    disabled={!rec.isAvailable}
                                                    className='bg-primary hover:bg-primary-dull text-white px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                                                >
                                                    Book Now
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {recommendations && recommendations.length === 0 && !loading && (
                    <div className='text-center py-12'>
                        <p className='text-gray-500 text-lg'>No suitable rooms found. Please try different dates or guest numbers.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OptimizeBooking;

