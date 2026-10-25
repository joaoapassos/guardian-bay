import { StoreChrome } from "./_components/store-chrome";
import { StoreFooter } from "./_components/store-footer";
import { StoreHeader } from "./_components/store-header";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreChrome header={<StoreHeader />} footer={<StoreFooter />}>
      {children}
    </StoreChrome>
  );
}
