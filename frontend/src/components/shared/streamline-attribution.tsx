
import Link from 'next/link'; 

const StreamlineAttribution = () => {
  return (
    <p className="font-normal font-cabin text-[8px] text-black">
      Free illustrations from{" "}
      <Link
        className="text-app-gray-600 underline cursor-pointer"
        href="https://www.streamlinehq.com"
      >
        Streamline
      </Link>{" "}
    </p>
  );
};

export default StreamlineAttribution;
