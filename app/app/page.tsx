import { Suspense } from "react";
import HomePage from "@/components/app/HomePage";
import BoardPage from "@/components/app/BoardPage";
import ShoppingPage from "@/components/app/ShoppingPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, LayoutDashboard, Scale, ShoppingCart } from "lucide-react";

export default function App() {
  return (
    <div className="grow flex flex-col bg-secondary min-h-0">
      <Tabs defaultValue="home" className="w-full grow flex flex-col min-h-0">
        <TabsContent value="home">
          <Suspense fallback={null}>
            <HomePage />
          </Suspense>
        </TabsContent>
        <TabsContent value="board" className="flex flex-col min-h-0">
          <Suspense fallback={null}>
            <BoardPage />
          </Suspense>
        </TabsContent>
        <TabsContent value="shop" className="flex flex-col min-h-0">
          <Suspense fallback={null}>
            <ShoppingPage />
          </Suspense>
        </TabsContent>
        <TabsContent value="fairness">Fairness</TabsContent>
        <TabsList className="w-full min-h-20 p-2 px-8 bg-background">
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
