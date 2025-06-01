import { LandingHero } from './LandingHero';
import { LandingCategories } from './LandingCategories';


const LandingLayout = () => {
    return (
            <div className="min-h-screen">
                <LandingHero />
                <LandingCategories />
            </div>
    );
}

export default LandingLayout;