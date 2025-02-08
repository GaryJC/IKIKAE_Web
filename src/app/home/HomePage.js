import { Box, Typography } from "@mui/material";
import Grid from '@mui/material/Grid2';
import Image from "next/image";

const ContextBlock = ({ title, description, image, reverse }) => (
    <>
        {reverse ? (
            <>
                <Grid size={{ xs: 12, md: 6 }} >
                    <Box display={"flex"}>
                        <Image src={image} alt="home1" width={250} height={250} />
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="h6" textAlign={"right"} fontWeight={"bold"}>{title}</Typography>
                    <Typography fontSize={"12px"} textAlign={"right"}>{description}</Typography>
                </Grid>
            </>
        ) : (
            <>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="h6" fontWeight={"bold"}>{title}</Typography>
                    <Typography variant="caption">{description}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box display={"flex"} justifyContent={"flex-end"}>
                        <Image src={image} alt="home1" width={250} height={250} />
                    </Box>
                </Grid>
            </>
        )}
    </>
)

export default function HomePage() {
    return (
        <div className="flex flex-col justify-center items-center">
            <Image
                src="/image/logo.svg"
                alt="logo"
                width={200}
                height={200}
                className="w-[50vw]"
            />
            <div className="flex gap-6 mt-3">
                <p className="text-white text-2xl font-bold">
                    Dream.
                </p>
                <p className="text-white text-2xl font-bold">
                    Change.
                </p>
                <p className="text-white text-2xl font-bold">
                    Achieve.
                </p>
            </div>

            <Box className="w-[55vw] mt-20">
                <Grid container alignItems={"center"} spacing={12}>
                    <ContextBlock
                        title={`Rise, Redefine, Reclaim. Fuel Your Dreams. Drive Change.\n生き変え.`}
                        image="https://placehold.co/250/png"
                        reverse={false}
                    />
                    <ContextBlock title="A brand that shapes your individualistic aspiration,
                    puts you on your focus." description={"Every garment is custom-tailored with your personal ID and chosen quote, putting individuality into every fabric."} image="https://placehold.co/250/png" reverse={true} />
                    <ContextBlock title="Set your dreams in motion. Put it on paper. Imprint them on fabric." description="Find Your Drive, Wear Your Purpose." image="https://placehold.co/250/png" reverse={false} />
                </Grid>
            </Box>
        </div>
    )
}