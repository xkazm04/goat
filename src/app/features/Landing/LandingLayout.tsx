import { LandingMain } from './LandingMain';
import { FeaturedListsSection } from './sub_LandingLists/FeaturedListsSection';
import { UserListsSection } from './sub_LandingLists/UserListsSection';
const LandingLayout = () => {
    return (
            <div className="min-h-screen">
                <LandingMain />
                <FeaturedListsSection />
                <UserListsSection />
            </div>
    );
}

export default LandingLayout;