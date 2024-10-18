import FileUpload from "@/app/components/FileUpload";

export default function Home() {
    return (
        <div className="">
            <div className="">
                <h1 className="text-black text-center text-4xl mt-4 mb-4">
                    File Editor
                </h1>
                <div className='items-center '>
                <FileUpload />
                </div>
            </div>
        </div>
    );
}
