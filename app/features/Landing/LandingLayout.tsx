import { LandingMain } from './LandingMain';
import { UserListsSection } from './UserListsSection';


const LandingLayout = () => {
    return (
            <div className="min-h-screen">
                <LandingMain />
                <UserListsSection className="bg-muted/50" />
            </div>
    );
}

export default LandingLayout;