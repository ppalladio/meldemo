import dynamic from 'next/dynamic';
import Character from './components/Character';
import Dialog from './components/Dialog';
// const Dialog = dynamic(() => import('./components/Dialog'), {
//     ssr: false,
// });
export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center  ">
			<Character/>
            <Dialog />
        </div>
    );
}
