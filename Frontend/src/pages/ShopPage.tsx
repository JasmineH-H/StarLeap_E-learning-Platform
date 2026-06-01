import React from 'react';
import { Headers } from '../components/Header';
import 'simplebar/dist/simplebar.min.css';
import { ShopIcons } from '../components/ShopIcon';
import { useAuth } from '../contexts/AuthContext';
import { makeAuthenticatedRequest } from '../utils/api';
import { useState } from 'react';

interface GiftItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: 'small' | 'large';
}

export const ShopPage: React.FC = () => {
  const bgUrl = '/assets/images/Quiz/quiz-bg.png';

  const giftItems: GiftItem[] = [
    {
      id: 'small-a',
      name: 'Small Gift A',
      price: 4,
      image: '/assets/images/PrizeIcon/secret-box1.png',
      size: 'small',
    },
    {
      id: 'small-b',
      name: 'Small Gift B',
      price: 5,
      image: '/assets/images/PrizeIcon/pencils.png',
      size: 'small',
    },
    {
      id: 'small-c',
      name: 'Small Gift C',
      price: 4,
      image: '/assets/images/PrizeIcon/stickers.png',
      size: 'small',
    },
    {
      id: 'large-a',
      name: 'Large Gift A',
      price: 15,
      image: '/assets/images/PrizeIcon/secret-box2.png',
      size: 'large',
    },
    {
      id: 'large-b',
      name: 'Large Gift B',
      price: 25,
      image: '/assets/images/PrizeIcon/camera.png',
      size: 'large',
    },
    {
      id: 'large-c',
      name: 'Large Gift C',
      price: 30,
      image: '/assets/images/PrizeIcon/game-controller.png',
      size: 'large',
    },
  ];

  const { user, crystals, setCrystals } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupStatus, setPopupStatus] = useState<'success' | 'fail' | null>(null);

  // const handleRedeem = (item: GiftItem) => {
  //   if (numCrystals >= item.price) {
  //     setPopupMessage(`You successfully redeemed ${item.name}!`);
  //     setPopupStatus('success');
  //   } else {
  //     setPopupMessage(`Not enough crystals to redeem ${item.name}.`);
  //     setPopupStatus('fail');
  //   }

  //   setShowPopup(true);
  // };

  const handleRedeem = async (item: GiftItem) => {
    if (!user) {
      setPopupMessage('You must be logged in to redeem.');
      setPopupStatus('fail');
      setShowPopup(true);
      return;
    }
    
    if (crystals < item.price) {
      setPopupMessage(`Not enough crystals to redeem ${item.name}.`);
      setPopupStatus('fail');
      setShowPopup(true);
      return;
    }

    try {
      // Call backend to redeem item + deduct crystals
      const res = await makeAuthenticatedRequest(`/api/study/crystals/${user._id}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          price: item.price,
        }),
      });

      if (!res.ok) throw new Error('Redeem failed');

      setCrystals((prev) => prev - item.price);

      setPopupMessage(`You successfully redeemed ${item.name}!`);
      setPopupStatus('success');
    } catch (err) {
      setPopupMessage('Something went wrong. Please try again.');
      setPopupStatus('fail');
    }

    setShowPopup(true);
  };

  return (
    <div
      className="h-screen  flex flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${bgUrl})`,
        width: '100vw',
        height: '100vh',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
      {/* Navigation */}
      <Headers />
      <ShopIcons />

      {/* Main Content */}
      <div className="flex w-2/3 h-auto rounded-xl overflow-hidden justify-center mx-auto my-auto">
        <div className="basis-1/3 bg-[#7E5D1A] flex flex-col gap-6 items-center justify-center py-20 px-7">
          <img src="assets/images/Shop/shopBox.png" alt="shop box icon" className="w-30" />

          <div className="text-white text-xl font-bold text-center">
            Welcome to Space Station Store !
          </div>

          <div className="text-white text-md text-center">
            Trade your knowledge crystals for awesome rewards! The more you learn, the more you can
            get!
          </div>
        </div>

        <div className="basis-2/3 bg-[#543a0770] flex items-center justify-center p-7">
          {/* <SimpleBar style={{ maxHeight: 800 }} className="pr-[60px] pl-[20px] py-[47px] w-full h-full"> */}
          {/* Scrollable Content */}
          <div className="h-[90%] w-full px-8 overflow-y-auto">
            <div className="grid grid-cols-3 gap-6">
              {giftItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col w-full h-full bg-[rgba(0,0,0,0.55)] rounded-xl items-center justify-center p-4 relative gap-3">
                  {/*  Item bg Box */}
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-contain" />
                  {/* Item Name */}
                  <h3 className="text-[#BEC5D2] text-xl font-bold text-center">{item.name}</h3>
                  {/* Price Tag */}
                  <div className="flex flex-row gap-2  justify-center items-center px-2 py-1 w-20 rounded-sm">
                    <span className="text-[#FEDEF2] text-lg font-bold ">{item.price}</span>
                    <img src="/assets/images/PrizeIcon/crystal-sm.png" className="w-7 h-7" />
                  </div>
                  <button
                    className="px-2 py-1 w-20 bg-[#FEDEF2] rounded-sm opacity-80 hover:opacity-100"
                    onClick={() => handleRedeem(item)}>
                    Redeem
                  </button>
                </div>
              ))}
            </div>
          </div>
          {showPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white w-80 p-6 rounded-xl shadow-xl text-center flex flex-col gap-4">
                {/* Title */}
                <h2
                  className={`text-2xl font-bold ${
                    popupStatus === 'success' ? 'text-green-600' : 'text-red-500'
                  }`}>
                  {popupStatus === 'success' ? 'Redeemed!' : 'Oops!'}
                </h2>

                {/* Message */}
                <p className="text-lg text-gray-700">{popupMessage}</p>

                {/* Button */}
                <button
                  onClick={() => setShowPopup(false)}
                  className="w-full py-2 rounded-md bg-[#7E5D1A] text-white text-lg hover:bg-[#6e5017]">
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
