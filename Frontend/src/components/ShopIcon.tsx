import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ShopIcons() {
    const navigate = useNavigate();
    const location = useLocation();
    const isShopPage = location.pathname === "/shop";

    const { crystals } = useAuth();

    return (
        <div className="flex items-center gap-6 md:pl-8 mx-18 pt-5">
            <div className="relative w-35">
                <img
                    src="/assets/images/CrystalIcon.png"
                    alt="crystal icon"
                    className="w-35"
                />
                <div className="absolute inset-0 flex items-center justify-end pr-10 text-[#561A2D] font-bold text-2xl pointer-events-none">
                    {crystals}
                </div>
            </div>

            {isShopPage ? (
                <button
                    onClick={() => navigate(-1)} // Go back
                    className="w-40 h-10 bg-[#BEC5D2] rounded-[10px] text-[#1E1E1E] text-2xl text-center hover:opacity-70 transition-opacity cursor-pointer"
                >
                    BACK
                </button>
            ) : (
                <button
                    className="relative w-40  hover:scale-110  transition-opacity cursor-pointer"
                    onClick={() => navigate("/shop")}
                >
                    <img
                        src="/assets/images/ShopIcon.png"
                        alt="shop icon"
                        className="w-40 pointer-events-none"
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-3 text-[#561A2D] font-bold text-2xl pointer-events-none">
                        SHOP
                    </div>
                </button>
            )}
        </div>
    );
}