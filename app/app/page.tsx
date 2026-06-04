import HomePage from "@/components/app/HomePage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, LayoutDashboard, Scale, ShoppingCart } from "lucide-react";

export default function App() {
  return (
    <div className="grow flex flex-col bg-secondary">
      <Tabs defaultValue="home" className="w-full grow">
        <TabsContent value="home">
          <HomePage />
        </TabsContent>
        <TabsContent value="board">Board</TabsContent>
        <TabsContent value="shop">Shop</TabsContent>
        <TabsContent value="fairness">Fairness</TabsContent>
        <TabsList className="w-full min-h-20 p-2 bg-background">
          <TabsTrigger value="home">
            <Home /> Home
          </TabsTrigger>
          <TabsTrigger value="board">
            <LayoutDashboard /> Board
          </TabsTrigger>
          <TabsTrigger value="shop">
            <ShoppingCart />
            Shop
          </TabsTrigger>
          <TabsTrigger value="fairness">
            <Scale /> Fairness
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
