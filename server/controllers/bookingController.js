import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import stripe from "stripe";

// Hàm kiểm tra tính khả dụng của phòng
const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {

  try {
    const bookings = await Booking.find({
      room,
      checkInDate: { $lte: checkOutDate },
      checkOutDate: { $gte: checkInDate },
    });

    const isAvailable = bookings.length === 0;
    return isAvailable;

  } catch (error) {
    console.error(error.message);
  }
};

// API kiểm tra tính khả dụng của phòng
// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate } = req.body;
    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    res.json({ success: true, isAvailable });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Hàm tính giá dựa trên loại phòng và số lượng khách
const calculatePrice = (roomData, adults, children, nights) => {
  let basePrice = roomData.pricePerNight;
  const totalGuests = adults + children;
  
  // Nếu 1 người lớn đặt phòng đôi hoặc phòng gia đình, áp dụng hệ số 1.5x
  const isDoubleOrFamily = roomData.roomType === "Double Bed" || roomData.roomType === "Family Suite";
  if (adults === 1 && isDoubleOrFamily) {
    basePrice = basePrice * 1.5;
  }
  
  // Tính tổng giá cho tất cả các đêm
  return basePrice * nights;
};

// API tạo đặt phòng mới
// POST /api/bookings/book
export const createBooking = async (req, res) => {
  try {

    const { room, checkInDate, checkOutDate, adults = 1, children = 0, guests } = req.body;

    const user = req.user._id;

    // Kiểm tra tính khả dụng trước khi đặt phòng
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room,
    });

    if (!isAvailable) {
      return res.json({ success: false, message: "Room is not available" });
    }

    // Lấy thông tin phòng và giá
    const roomData = await Room.findById(room).populate("hotel");
    
    // Xác thực sức chứa khách
    const totalGuests = (adults || guests) + (children || 0);
    if (adults < roomData.minAdults || adults > roomData.maxAdults) {
      return res.json({ 
        success: false, 
        message: `Phòng này yêu cầu ${roomData.minAdults}-${roomData.maxAdults} người` 
      });
    }
    if (children < roomData.minChildren || children > roomData.maxChildren) {
      return res.json({ 
        success: false, 
        message: `Phòng này cho phép ${roomData.minChildren}-${roomData.maxChildren} trẻ em` 
      });
    }

    // Tính tổng giá dựa trên số đêm và số khách
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const totalPrice = calculatePrice(roomData, adults || guests, children || 0, nights);

    const booking = await Booking.create({
      user,
      room,
      hotel: roomData.hotel._id,
      adults: adults || guests || 1,
      children: children || 0,
      guests: totalGuests,
      checkInDate,
      checkOutDate,
      totalPrice,
    });

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: req.user.email,
      subject: 'Chi tiết đặt phòng khách sạn',
      html: `
        <h2>Chi tiết đặt chỗ của bạn</h2>
        <p>Thân gửi ${req.user.username},</p>
        <p>Cảm ơn bạn đã đặt chỗ! Dưới đây là thông tin của bạn:</p>
        <ul>
          <li><strong>Mã đặt chỗ:</strong> ${booking.id}</li>
          <li><strong>Tên khách sạn:</strong> ${roomData.hotel.name}</li>
          <li><strong>Vị trí:</strong> ${roomData.hotel.address}</li>
          <li><strong>Ngày:</strong> ${booking.checkInDate.toDateString()}</li>
          <li><strong>Số tiền đặt cọc:</strong>  ${process.env.CURRENCY || '$'} ${booking.totalPrice} /đêm</li>
        </ul>
        <p>Chúng tôi mong đợi được đón tiếp bạn!</p>
        <p>Nếu bạn cần thực hiện bất kỳ thay đổi nào, hãy liên hệ với chúng tôi.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Đặt chỗ thành công" });

  } catch (error) {
    console.log(error);
    
    res.json({ success: false, message: "Không thể tạo đặt chỗ" });
  }
};

// API lấy tất cả đặt phòng của người dùng
// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
  try {
    const user = req.user._id;
    const bookings = await Booking.find({ user }).populate("room hotel").sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.json({ success: false, message: "Không thể lấy dữ liệu đặt chỗ" });
  }
};


export const getHotelBookings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.auth.userId });
    if (!hotel) {
      return res.json({ success: false, message: "Không tìm thấy khách sạn" });
    }
    const bookings = await Booking.find({ hotel: hotel._id }).populate("room hotel user").sort({ createdAt: -1 });
    // Tổng số đặt phòng
    const totalBookings = bookings.length;
    // Tổng doanh thu
    const totalRevenue = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);

    res.json({ success: true, dashboardData: { totalBookings, totalRevenue, bookings } });
  } catch (error) {
    res.json({ success: false, message: "Không thể lấy dữ liệu đặt chỗ" });
  }
};


export const stripePayment = async (req, res) => {
  try {

    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    const roomData = await Room.findById(booking.room).populate("hotel");
    const totalPrice = booking.totalPrice;

    const { origin } = req.headers;

    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    // Tạo các mục thanh toán cho Stripe
    const line_items = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: roomData.hotel.name,
          },
          unit_amount: totalPrice * 100,
        },
        quantity: 1,
      },
    ];

    // Tạo phiên thanh toán
    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata: {
        bookingId,
      },
    });
    res.json({ success: true, url: session.url });

  } catch (error) {
    res.json({ success: false, message: "Thanh toán thất bại" });
  }
}

// API tối ưu hóa đặt phòng cho nhiều khách (bao gồm tour group)
// POST /api/bookings/optimize
export const optimizeRoomBooking = async (req, res) => {
  try {
    const { adults, children, checkInDate, checkOutDate, city } = req.body;
    
    if (!adults || adults < 1) {
      return res.json({ success: false, message: "Ít nhất cần có 1 người lớn." });
    }

    const totalGuests = adults + (children || 0);
    
    // Tính số đêm
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Tìm tất cả các phòng có sẵn
    let query = { isAvailable: true };
    if (city) {
      const Hotel = (await import("../models/Hotel.js")).default;
      const hotels = await Hotel.find({ city: new RegExp(city, "i") });
      query.hotel = { $in: hotels.map(h => h._id.toString()) };
    }

    const allRooms = await Room.find(query)
      .populate({
        path: 'hotel',
        populate: {
          path: 'owner',
          select: 'image',
        },
      });

    // Đối với nhóm lớn (tour group >= 10 người), tìm các kết hợp phòng tối ưu từ TẤT CẢ các phòng có sẵn
    if (totalGuests >= 10) {
      // Đối với tour group, chúng ta cần tìm các kết hợp phòng, nên sử dụng TẤT CẢ các phòng
      // không chỉ các phòng có thể chứa đúng số người
      const solutions = await findOptimalRoomCombinations(allRooms, adults, children || 0, checkInDate, checkOutDate);
      return res.json({ 
        success: true, 
        solutions,
        totalGuests,
        nights,
        message: `Found ${solutions.length} optimal room combination(s) for ${totalGuests} guests`
      });
    }

    // Đối với nhóm nhỏ, lọc các phòng có thể chứa được khách
    const suitableRooms = allRooms.filter(room => {
      const maxCapacity = room.maxAdults + room.maxChildren;
      const minCapacity = room.minAdults + room.minChildren;
      const totalCapacity = maxCapacity;
      // Phòng phải có thể chứa ít nhất số tối thiểu và tối đa số tối đa
      return totalCapacity >= (adults + (children || 0)) &&
             adults >= room.minAdults && 
             adults <= room.maxAdults &&
             (children || 0) >= room.minChildren &&
             (children || 0) <= room.maxChildren;
    });

    // Đối với nhóm nhỏ, trả về các đề xuất phòng riêng lẻ
    const recommendations = await Promise.all(
      suitableRooms.map(async (room) => {
        const isAvailable = await checkAvailability({
          checkInDate,
          checkOutDate,
          room: room._id.toString(),
        });

        const price = calculatePrice(room, adults, children || 0, nights);
        const pricePerPerson = price / totalGuests;

        return {
          room: {
            _id: room._id,
            roomType: room.roomType,
            pricePerNight: room.pricePerNight,
            hotel: room.hotel,
            amenities: room.amenities,
            images: room.images,
            minAdults: room.minAdults,
            maxAdults: room.maxAdults,
            minChildren: room.minChildren,
            maxChildren: room.maxChildren,
          },
          isAvailable,
          totalPrice: price,
          pricePerPerson,
          nights,
          adults,
          children: children || 0,
        };
      })
    );

    // Sắp xếp theo giá mỗi người
    recommendations.sort((a, b) => a.pricePerPerson - b.pricePerPerson);

    res.json({
      success: true,
      recommendations,
      totalGuests,
      nights,
    });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Hàm helper tìm các kết hợp phòng tối ưu cho nhóm lớn
const findOptimalRoomCombinations = async (rooms, adults, children, checkInDate, checkOutDate) => {
  const solutions = [];
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const timeDiff = checkOut.getTime() - checkIn.getTime();
  const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

  // Đầu tiên, kiểm tra tính khả dụng cho tất cả các phòng
  const roomAvailability = new Map();
  for (const room of rooms) {
    const isAvailable = await checkAvailability({
      checkInDate,
      checkOutDate,
      room: room._id.toString(),
    });
    roomAvailability.set(room._id.toString(), isAvailable);
  }

  // Lọc chỉ các phòng có sẵn
  const availableRooms = rooms.filter(room => roomAvailability.get(room._id.toString()));

  if (availableRooms.length === 0) {
    return []; // Không có phòng nào có sẵn
  }

  // Thử các kết hợp khác nhau
  const combinations = generateRoomCombinations(availableRooms, adults, children);
  
  for (const combination of combinations) {
    let totalPrice = 0;
    const roomDetails = [];
    const roomCounts = new Map(); // Theo dõi số lần mỗi phòng được sử dụng

    // Đếm số lần sử dụng phòng
    for (const { room } of combination) {
      const roomId = room._id.toString();
      roomCounts.set(roomId, (roomCounts.get(roomId) || 0) + 1);
    }

    // Kiểm tra xem có đủ phòng có sẵn không (xem xét việc đặt nhiều lần cùng một phòng)
    let hasEnoughRooms = true;
    for (const [roomId, count] of roomCounts.entries()) {
      // Hiện tại, chúng ta giả định mỗi phòng chỉ có thể được đặt một lần trong một khoảng thời gian
      // Trong hệ thống thực tế, bạn sẽ kiểm tra xem có nhiều phòng cùng loại không
      if (count > 1) {
        // Điều này sẽ yêu cầu nhiều phòng giống hệt nhau - đơn giản hóa cho hiện tại
        // Trong sản xuất, bạn sẽ kiểm tra kho phòng
      }
    }

    if (!hasEnoughRooms) continue;

    // Tính giá cho tất cả các phòng trong kết hợp
    for (const { room, roomAdults, roomChildren } of combination) {
      const price = calculatePrice(room, roomAdults, roomChildren, nights);
      totalPrice += price;

      roomDetails.push({
        room: {
          _id: room._id,
          roomType: room.roomType,
          hotel: room.hotel,
          amenities: room.amenities,
          images: room.images,
        },
        adults: roomAdults,
        children: roomChildren,
        price,
      });
    }

    solutions.push({
      rooms: roomDetails,
      totalPrice,
      totalRooms: combination.length,
      pricePerPerson: totalPrice / (adults + children),
      nights,
    });
  }

  // Sắp xếp theo tổng giá, sau đó theo số phòng
  solutions.sort((a, b) => {
    if (Math.abs(a.totalPrice - b.totalPrice) < 0.01) {
      return a.totalRooms - b.totalRooms; // Ưu tiên ít phòng hơn nếu cùng giá
    }
    return a.totalPrice - b.totalPrice;
  });
  
  return solutions.slice(0, 10); // Trả về top 10 phương án
};

// Hàm helper tạo các kết hợp phòng sử dụng thuật toán cải tiến
const generateRoomCombinations = (rooms, totalAdults, totalChildren) => {
  const combinations = [];
  
  if (rooms.length === 0) return combinations;
  
  // Sắp xếp phòng theo giá mỗi người (tăng dần) và sức chứa (giảm dần)
  const sortedRooms = [...rooms].sort((a, b) => {
    const pricePerPersonA = a.pricePerNight / (a.maxAdults + a.maxChildren);
    const pricePerPersonB = b.pricePerNight / (b.maxAdults + b.maxChildren);
    if (Math.abs(pricePerPersonA - pricePerPersonB) > 0.01) {
      return pricePerPersonA - pricePerPersonB;
    }
    const capacityA = a.maxAdults + a.maxChildren;
    const capacityB = b.maxAdults + b.maxChildren;
    return capacityB - capacityA;
  });

  // Sử dụng phương pháp quy hoạch động để tối ưu hóa tốt hơn
  const findCombinations = (remainingAdults, remainingChildren, currentCombination, roomIndex, depth = 0) => {
    // Trường hợp cơ bản: tất cả khách đã được phân bổ
    if (remainingAdults === 0 && remainingChildren === 0) {
      combinations.push([...currentCombination]);
      return;
    }

    // Dừng nếu đã thử đủ kết hợp hoặc đạt độ sâu tối đa
    if (combinations.length >= 10 || depth > 15 || roomIndex >= sortedRooms.length) {
      return;
    }

    // Thử phòng hiện tại
    const room = sortedRooms[roomIndex];
    
    // Tính toán các phân bổ có thể cho phòng này
    const maxAdultsForRoom = Math.min(remainingAdults, room.maxAdults);
    const maxChildrenForRoom = Math.min(remainingChildren, room.maxChildren);
    
    // Thử các phân bổ khác nhau cho loại phòng này
    for (let a = room.minAdults; a <= maxAdultsForRoom; a++) {
      for (let c = room.minChildren; c <= maxChildrenForRoom; c++) {
        // Kiểm tra xem phân bổ này có hợp lệ không
        if (a + c <= room.maxAdults + room.maxChildren && 
            a <= remainingAdults && 
            c <= remainingChildren) {
          
          // Thử sử dụng từ 1 đến nhiều phòng cùng loại
          const maxRooms = Math.min(
            Math.floor(remainingAdults / a) + (remainingAdults % a > 0 ? 1 : 0),
            Math.floor(remainingChildren / c) + (remainingChildren % c > 0 ? 1 : 0),
            10 // Giới hạn để tránh quá nhiều kết hợp
          );

          for (let count = 1; count <= maxRooms && combinations.length < 10; count++) {
            const totalAdultsUsed = a * count;
            const totalChildrenUsed = c * count;
            
            if (totalAdultsUsed <= remainingAdults && totalChildrenUsed <= remainingChildren) {
              const newAllocations = Array(count).fill(null).map(() => ({
                room,
                roomAdults: a,
                roomChildren: c
              }));
              
              findCombinations(
                remainingAdults - totalAdultsUsed,
                remainingChildren - totalChildrenUsed,
                [...currentCombination, ...newAllocations],
                roomIndex + 1,
                depth + 1
              );
            }
          }
        }
      }
    }

    // Cũng thử bỏ qua phòng này
    findCombinations(remainingAdults, remainingChildren, currentCombination, roomIndex + 1, depth);
  };

  findCombinations(totalAdults, totalChildren, [], 0);
  
  // Loại bỏ trùng lặp và sắp xếp theo tổng giá
  const uniqueCombinations = [];
  const seen = new Set();
  
  for (const combo of combinations) {
    // Tạo một khóa duy nhất cho kết hợp này
    const key = combo
      .map(c => `${c.room._id}-${c.roomAdults}-${c.roomChildren}`)
      .sort()
      .join('|');
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCombinations.push(combo);
    }
  }

  // Sắp xếp theo số phòng (ít hơn là tốt hơn) và sau đó theo tổng giá ước tính
  uniqueCombinations.sort((a, b) => {
    if (a.length !== b.length) {
      return a.length - b.length; // Ưu tiên ít phòng hơn
    }
    // Nếu cùng số phòng, ưu tiên tổng giá thấp hơn
    const priceA = a.reduce((sum, c) => sum + c.room.pricePerNight, 0);
    const priceB = b.reduce((sum, c) => sum + c.room.pricePerNight, 0);
    return priceA - priceB;
  });

  return uniqueCombinations.slice(0, 10); // Trả về top 10 phương án
};