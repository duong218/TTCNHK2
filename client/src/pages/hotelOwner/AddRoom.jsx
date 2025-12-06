import React, { useState } from 'react'
import { assets } from '../../assets/assets'
import Title from '../../components/Title'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'

const AddRoom = () => {

    const { axios, getToken } = useAppContext()

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [loading, setLoading] = useState(false);

    const [inputs, setInputs] = useState({
        roomType: '',
        pricePerNight: 0,
        minAdults: 1,
        maxAdults: 2,
        minChildren: 0,
        maxChildren: 2,
        amenities: {
            'Wi-Fi miễn phí': false,
            'Bữa sáng miễn phí': false,
            'Dịch vụ phòng': false,
            'Hướng ra núi': false,
            'Hồ Bơi': false
        }
    })

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        // Check if all inputs are filled
        if (!inputs.roomType || !inputs.pricePerNight || !inputs.amenities || !Object.values(images).some(image => image)) {
            toast.error("Vui lòng điền đầy đủ tất cả các chi tiết.")
            return;
        }
        
        // Validate guest capacity
        if (inputs.minAdults > inputs.maxAdults) {
            toast.error("Số người lớn tối thiểu không thể lớn hơn số người lớn tối đa")
            return;
        }
        if (inputs.minChildren > inputs.maxChildren) {
            toast.error("Số trẻ tối thiểu không thể lớn hơn số trẻ tối đa")
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData()
            formData.append('roomType', inputs.roomType)
            formData.append('pricePerNight', inputs.pricePerNight)
            formData.append('minAdults', inputs.minAdults)
            formData.append('maxAdults', inputs.maxAdults)
            formData.append('minChildren', inputs.minChildren)
            formData.append('maxChildren', inputs.maxChildren)
            // Converting Amenities to Array & keeping only enabled Amenities
            const amenities = Object.keys(inputs.amenities).filter(key => inputs.amenities[key])
            formData.append('amenities', JSON.stringify(amenities))

            // Adding Images to FormData
            Object.keys(images).forEach((key) => {
                images[key] && formData.append('images', images[key])
            })

            const { data } = await axios.post('/api/rooms/', formData, { headers: { Authorization: `Bearer ${await getToken()}` } })

            if (data.success) {
                toast.success(data.message)
                setInputs({
                    roomType: '',
                    pricePerNight: 0,
                    minAdults: 1,
                    maxAdults: 2,
                    minChildren: 0,
                    maxChildren: 2,
                    amenities: {
                        'Wi-Fi miễn phí': false,
                        'Bữa sáng miễn phí': false,
                        'Dịch vụ phòng': false,
                        'Hướng ra núi': false,
                        'Hồ bơi': false
                    }
                })
                setImages({ 1: null, 2: null, 3: null, 4: null })
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmitHandler} className="max-w-6xl mx-auto">
            <Title align='left' font='outfit' title='Thêm phòng' subTitle='Điền thông tin chi tiết và chính xác về phòng, giá cả và tiện ích để nâng cao trải nghiệm đặt phòng của người dùng.' />
            
            <div className="flex flex-col md:flex-row gap-6 mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Left Side - Image Preview/Upload */}
                <div className="md:w-2/5 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 flex flex-col">
                    <p className='text-gray-800 font-semibold mb-4'>Hình ảnh phòng</p>
                    <div className='grid grid-cols-2 gap-3 flex-1'>
                        {Object.keys(images).map((key) => (
                            <label key={key} htmlFor={`roomImage${key}`} className="cursor-pointer group">
                                <div className="relative h-32 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 group-hover:border-indigo-400 transition-all">
                                    {images[key] ? (
                                        <>
                                            <img 
                                                className='w-full h-full object-cover' 
                                                src={URL.createObjectURL(images[key])} 
                                                alt={`Room image ${key}`} 
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                                <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">Thay đổi</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                                            <img className='h-8 w-8 opacity-50' src={assets.uploadArea} alt="Upload" />
                                            <span className="text-xs text-gray-400 mt-2">Thêm ảnh</span>
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    accept='image/*' 
                                    id={`roomImage${key}`} 
                                    hidden
                                    onChange={e => setImages({ ...images, [key]: e.target.files[0] })} 
                                />
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">Tối đa 4 hình ảnh. Hình ảnh đầu tiên sẽ là ảnh đại diện.</p>
                </div>

                {/* Right Side - Form Fields */}
                <div className="md:w-3/5 p-6 md:p-8">
                    {/* Room Type and Price */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                        <div>
                            <label htmlFor="roomType" className='block text-gray-700 font-medium mb-2'>Loại phòng</label>
                            <select 
                                id="roomType"
                                className='border border-gray-300 rounded-lg px-4 py-2.5 w-full focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all' 
                                value={inputs.roomType} 
                                onChange={(e) => setInputs({ ...inputs, roomType: e.target.value })}
                            >
                                <option value=''>Chọn loại phòng</option>
                                <option value='Single Bed'>Giường đơn</option>
                                <option value='Double Bed'>Giường đôi</option>
                                <option value='Luxury Room'>Phòng cao cấp</option>
                                <option value='Family Suite'>Phòng Suite Gia Đình</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="price" className='block text-gray-700 font-medium mb-2'>Giá mỗi đêm</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input 
                                    id="price"
                                    type="number" 
                                    placeholder='0' 
                                    className='border border-gray-300 rounded-lg px-4 py-2.5 pl-8 w-full focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all' 
                                    value={inputs.pricePerNight} 
                                    onChange={(e) => setInputs({ ...inputs, pricePerNight: e.target.value })} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Guest Capacity */}
                    <div className='mb-4'>
                        <label className='block text-gray-700 font-medium mb-3'>Sức chứa khách</label>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                            <div>
                                <label className='block text-xs text-gray-600 mb-1'>Người lớn (Tối thiểu)</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="10"
                                    className='border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all' 
                                    value={inputs.minAdults} 
                                    onChange={(e) => setInputs({ ...inputs, minAdults: parseInt(e.target.value) || 1 })} 
                                />
                            </div>
                            <div>
                                <label className='block text-xs text-gray-600 mb-1'>Người lớn (Tối đa)</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="10"
                                    className='border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all' 
                                    value={inputs.maxAdults} 
                                    onChange={(e) => setInputs({ ...inputs, maxAdults: parseInt(e.target.value) || 2 })} 
                                />
                            </div>
                            <div>
                                <label className='block text-xs text-gray-600 mb-1'>Trẻ em (Tối thiểu)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="10"
                                    className='border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all' 
                                    value={inputs.minChildren} 
                                    onChange={(e) => setInputs({ ...inputs, minChildren: parseInt(e.target.value) || 0 })} 
                                />
                            </div>
                            <div>
                                <label className='block text-xs text-gray-600 mb-1'>Trẻ em (Tối đa)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="10"
                                    className='border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all' 
                                    value={inputs.maxChildren} 
                                    onChange={(e) => setInputs({ ...inputs, maxChildren: parseInt(e.target.value) || 2 })} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Amenities */}
                    <div className='mb-6'>
                        <label className='block text-gray-700 font-medium mb-3'>Tiện ích</label>
                        <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                            {Object.keys(inputs.amenities).map((amenity, index) => (
                                <label 
                                    key={index} 
                                    htmlFor={`amenities${index + 1}`}
                                    className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all"
                                >
                                    <input 
                                        type='checkbox' 
                                        id={`amenities${index + 1}`} 
                                        checked={inputs.amenities[amenity]}
                                        onChange={() => setInputs({ ...inputs, amenities: { ...inputs.amenities, [amenity]: !inputs.amenities[amenity] } })}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700">{amenity}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-gray-200">
                        <button 
                            className={`
                                w-full
                                bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-lg 
                                font-semibold text-base
                                transition-all duration-200
                                hover:shadow-lg
                                active:scale-95
                                focus:outline-none focus:ring-4 focus:ring-indigo-300
                                ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                            `} 
                            disabled={loading}
                            type="submit"
                        >
                            {loading ? "Đang thêm phòng..." : "Thêm phòng"}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    )
}

export default AddRoom