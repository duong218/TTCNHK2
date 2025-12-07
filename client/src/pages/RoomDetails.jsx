import React, { useEffect, useState } from 'react'
import { assets, roomCommonData } from '../assets/assets'
import { useAppContext } from '../context/AppContext';
import { useParams, useSearchParams } from 'react-router-dom';
import StarRating from '../components/StarRating';
import toast from 'react-hot-toast';

const RoomDetails = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { facilityIcons, rooms, getToken, axios, navigate } = useAppContext();

    const [room, setRoom] = useState(null);
    const [mainImage, setMainImage] = useState(null);
    const [checkInDate, setCheckInDate] = useState(null);
    const [checkOutDate, setCheckOutDate] = useState(null);
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);

    const [isAvailable, setIsAvailable] = useState(false);

    // Check if the Room is Available
    const checkAvailability = async () => {
        try {

            //  Check is Check-In Date is greater than Check-Out Date
            if (checkInDate >= checkOutDate) {
                toast.error('Ngày nhận phòng phải trước ngày trả phòng')
                return;
            }

            const { data } = await axios.post('/api/bookings/check-availability', { room: id, checkInDate, checkOutDate })
            if (data.success) {
                if (data.isAvailable) {
                    setIsAvailable(true)
                    toast.success('Phòng còn trống')
                } else {
                    setIsAvailable(false)
                    toast.error('Phòng không có sẵn')
                }
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // onSubmitHandler function to check availability & book the room
    const onSubmitHandler = async (e) => {
        try {
            e.preventDefault();
            if (!isAvailable) {
                return checkAvailability();
            } else {
                const { data } = await axios.post('/api/bookings/book', { 
                    room: id, 
                    checkInDate, 
                    checkOutDate, 
                    adults, 
                    children,
                    paymentMethod: "Thanh toán tại khách sạn" 
                }, { headers: { Authorization: `Bearer ${await getToken()}` } })
                if (data.success) {
                    toast.success(data.message)
                    navigate('/my-bookings')
                    scrollTo(0, 0)
                } else {
                    toast.error(data.message)
                }
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        const room = rooms.find(room => room._id === id);
        if (room) {
            setRoom(room);
            setMainImage(room.images[0]);
            // Set values from query params if available, otherwise use defaults
            const queryAdults = searchParams.get('adults');
            const queryChildren = searchParams.get('children');
            const queryCheckIn = searchParams.get('checkIn');
            const queryCheckOut = searchParams.get('checkOut');
            
            setAdults(queryAdults ? parseInt(queryAdults) : (room.minAdults || 1));
            setChildren(queryChildren ? parseInt(queryChildren) : (room.minChildren || 0));
            if (queryCheckIn) setCheckInDate(queryCheckIn);
            if (queryCheckOut) setCheckOutDate(queryCheckOut);
        }
    }, [rooms, id, searchParams]);

    return room && (
        <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>

            {/* Room Details */}
            <div className='flex flex-col md:flex-row items-start md:items-center gap-2'>
                <h1 className='text-3xl md:text-4xl font-playfair'>{room.hotel.name} <span className='font-inter text-sm'>({room.roomType})</span></h1>
                <p className='text-xs font-inter py-1.5 px-3 text-white bg-orange-500 rounded-full'>20% OFF</p>
            </div>
            <div className='flex items-center gap-1 mt-2'>
                <StarRating />
                <p className='ml-2'>Hơn 200 bài đánh giá</p>
            </div>
            <div className='flex items-center gap-1 text-gray-500 mt-2'>
                <img src={assets.locationIcon} alt='location-icon' />
                <span>{room.hotel.address}</span>
            </div>

            {/* Room Images */}
            <div className='flex flex-col lg:flex-row mt-6 gap-6'>
                <div className='lg:w-1/2 w-full'>
                    <img className='w-full rounded-xl shadow-lg object-cover'
                        src={mainImage} alt='Room Image' />
                </div>

                <div className='grid grid-cols-2 gap-4 lg:w-1/2 w-full'>
                    {room?.images.length > 1 && room.images.map((image, index) => (
                        <img key={index} onClick={() => setMainImage(image)}
                            className={`w-full rounded-xl shadow-md object-cover cursor-pointer ${mainImage === image && 'outline-3 outline-orange-500'}`} src={image} alt='Room Image' />
                    ))}
                </div>
            </div>

            {/* Room Highlights */}
            <div className='flex flex-col md:flex-row md:justify-between mt-10'>
                <div className='flex flex-col'>
                    <h1 className='text-3xl md:text-4xl font-playfair'>Trải nghiệm sự sang trọng chưa từng có</h1>
                    <div className='flex flex-wrap items-center mt-3 mb-6 gap-4'>
                        {room.amenities.map((item, index) => (
                            <div key={index} className='flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100'>
                                <img src={facilityIcons[item]} alt={item} className='w-5 h-5' />
                                <p className='text-xs'>{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Room Price */}
                <div className='text-right'>
                    <p className='text-2xl font-medium'>${room.pricePerNight}/night</p>
                    {checkInDate && checkOutDate && (() => {
                        const checkIn = new Date(checkInDate);
                        const checkOut = new Date(checkOutDate);
                        const nights = Math.ceil((checkOut - checkIn) / (1000 * 3600 * 24));
                        const isDoubleOrFamily = room.roomType === "Double Bed" || room.roomType === "Family Suite";
                        let calculatedPrice = room.pricePerNight;
                        if (adults === 1 && isDoubleOrFamily) {
                            calculatedPrice = room.pricePerNight * 1.5;
                        }
                        const totalPrice = calculatedPrice * nights;
                        return (
                            <div className='mt-2'>
                                <p className='text-sm text-gray-500'>{adults} adult(s), {children} child(ren)</p>
                                <p className='text-lg text-primary font-semibold'>Tổng cộng: ${totalPrice.toFixed(2)} ({nights} đêm {nights > 1 ? 's' : ''})</p>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* CheckIn CheckOut Form */}
            <form onSubmit={onSubmitHandler} className='flex flex-col md:flex-row items-start md:items-center justify-between bg-white shadow-[0px_0px_20px_rgba(0,0,0,0.15)] p-6 rounded-xl mx-auto mt-16 max-w-6xl'>
                <div className='flex flex-col flex-wrap md:flex-row items-start md:items-center gap-4 md:gap-10 text-gray-500'>
                    <div className='flex flex-col'>
                        <label htmlFor='checkInDate' className='font-medium'>Ngày đặt</label>
                        <input onChange={(e) => setCheckInDate(e.target.value)} id='checkInDate' type='date' min={new Date().toISOString().split('T')[0]} className='w-full rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none' placeholder='Check-In' required />
                    </div>
                    <div className='w-px h-15 bg-gray-300/70 max-md:hidden'></div>
                    <div className='flex flex-col'>
                        <label htmlFor='checkOutDate' className='font-medium'>Ngày trả</label>
                        <input onChange={(e) => setCheckOutDate(e.target.value)} id='checkOutDate' type='date' min={checkInDate} disabled={!checkInDate} className='w-full rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none' placeholder='Check-Out' required />
                    </div>
                    <div className='w-px h-15 bg-gray-300/70 max-md:hidden'></div>
                    <div className='flex flex-col'>
                        <label htmlFor='adults' className='font-medium'>Người lớn</label>
                        <input 
                            onChange={(e) => {
                                const value = Math.max(room?.minAdults || 1, Math.min(room?.maxAdults || 10, parseInt(e.target.value) || 1));
                                setAdults(value);
                            }} 
                            value={adults} 
                            id='adults' 
                            type='number' 
                            min={room?.minAdults || 1}
                            max={room?.maxAdults || 10}
                            className='max-w-20 rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none' 
                            placeholder='1' 
                            required 
                        />
                    </div>
                    <div className='w-px h-15 bg-gray-300/70 max-md:hidden'></div>
                    <div className='flex flex-col'>
                        <label htmlFor='children' className='font-medium'>Trẻ nhỏ</label>
                        <input 
                            onChange={(e) => {
                                const value = Math.max(room?.minChildren || 0, Math.min(room?.maxChildren || 5, parseInt(e.target.value) || 0));
                                setChildren(value);
                            }} 
                            value={children} 
                            id='children' 
                            type='number' 
                            min={room?.minChildren || 0}
                            max={room?.maxChildren || 5}
                            className='max-w-20 rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none' 
                            placeholder='0' 
                        />
                    </div>
                </div>
                <button type='submit' className='bg-primary hover:bg-primary-dull active:scale-95 transition-all text-white rounded-md max-md:w-full max-md:mt-6 md:px-25 py-3 md:py-4 text-base cursor-pointer'>{isAvailable ? "Book Now" : "Check Availability"}</button>
            </form>

            {/* Common Specifications */}
            <div className='mt-25 space-y-4'>                
                {roomCommonData.map((spec, index) => (
                    <div key={index} className='flex items-start gap-2'>
                        <img className='w-6.5' src={spec.icon} alt={`${spec.title}-icon`} />
                        <div>
                            <p className='text-base'>{spec.title}</p>
                            <p className='text-gray-500'>{spec.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className='max-w-3xl border-y border-gray-300 my-15 py-10 text-gray-500'>
                <p>Khách sẽ được phân bổ ở tầng trệt tùy theo tình trạng phòng trống. Bạn sẽ có một căn hộ hai phòng ngủ thoải mái mang đậm phong cách thành phố. Giá trên áp dụng cho hai khách, vui lòng ghi rõ số lượng khách tại ô dành cho khách để biết giá chính xác cho nhóm. Khách sẽ được phân bổ ở tầng trệt tùy theo tình trạng phòng trống. Bạn sẽ có căn hộ hai phòng ngủ thoải mái, mang đậm phong cách thành phố.</p>
            </div>

            <div className='flex flex-col items-start gap-4'>
                <div className='flex gap-4'>
                    <img className='h-14 w-14 md:h-18 md:w-18 rounded-full' src={room.hotel.owner.image} alt='Host' />
                    <div>
                        <p className='text-lg md:text-xl'>Được tổ chức bởi {room.hotel.name}</p>
                        <div className='flex items-center mt-1'>
                            <StarRating />
                            <p className='ml-2'>Hơn 200 bài đánh giá</p>
                        </div>
                    </div>
                </div>
                <button className='px-6 py-2.5 mt-4 rounded text-white bg-primary hover:bg-primary-dull transition-all cursor-pointer'>
                    Liên hệ ngay
                </button>
            </div>
        </div>
    )
}

export default RoomDetails
