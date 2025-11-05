import { Trophy, Music, Gamepad2, BookOpen, Shield, Headphones, Sword, Users, Disc } from "lucide-react";

export const categoryPreviews = {
  Sports: {
    Basketball: {
      name: "NBA Teams",
      icon: Trophy,
      teams: ["Lakers", "Celtics", "Warriors"]
    },
    "Ice-Hockey": {
      name: "NHL Teams", 
      icon: Shield,
      teams: ["Maple Leafs", "Rangers", "Bruins"]
    },
    Soccer: {
      name: "Soccer Clubs",
      icon: Users,
      teams: ["Real Madrid", "Barcelona", "Man City"]
    }
  },
  Music: {
    subcategories: [
      { name: "Hip Hop Artists", icon: Music, items: [Headphones, Music, Disc] },
      { name: "Rock Bands", icon: Music, items: [Music, Users, Disc] },
      { name: "Pop Albums", icon: Disc, items: [Disc, Music, Headphones] }
    ]
  },
  Games: {
    subcategories: [
      { name: "Action RPGs", icon: Gamepad2, items: [Sword, Shield, Trophy] },
      { name: "Strategy Games", icon: Gamepad2, items: [Trophy, Users, Shield] },
      { name: "Indie Games", icon: Gamepad2, items: [Gamepad2, Trophy, Users] }
    ]
  },
  Stories: {
    subcategories: [
      { name: "Fantasy Novels", icon: BookOpen, items: [BookOpen, Sword, Shield] },
      { name: "Sci-Fi Movies", icon: BookOpen, items: [BookOpen, Trophy, Users] },
      { name: "TV Series", icon: BookOpen, items: [Users, BookOpen, Trophy] }
    ]
  }
};

