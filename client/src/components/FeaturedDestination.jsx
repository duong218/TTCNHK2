import React from 'react'
import { useAppContext } from '../context/AppContext';
import Title from './Title';
import HotelCard from './HotelCard';


const FeaturedDestination = () => {
    const { rooms, navigate } = useAppContext();
    return rooms.length > 0 && (
        <div className='flex flex-col items-center px-6 md:px-16 lg:px-24 bg-slate-50 py-20'>
            <Title title="Điểm đến nổi bật" subTitle="Khám phá bộ sưu tập các bất động sản đặc biệt do chúng tôi chọn lọc trên khắp thế giới, mang đến sự sang trọng vô song và những trải nghiệm khó quên." />
            <div className='flex flex-wrap items-center justify-center gap-6 mt-20'>
                {rooms.slice(0, 4).map((room, index) => (
                    <HotelCard key={room._id} room={room} index={index} />
                ))}
            </div>
            <button onClick={() => { navigate('/rooms'); scrollTo(0, 0) }} className='my-16 px-4 py-2 text-sm font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 transition-all cursor-pointer'>
                Xem Tất Cả Điểm Đến
            </button>
        </div>
    )
}

export default FeaturedDestination